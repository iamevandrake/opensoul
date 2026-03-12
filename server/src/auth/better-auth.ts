import type { Request, RequestHandler } from "express";
import type { IncomingHttpHeaders } from "node:http";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { toNodeHandler } from "better-auth/node";
import { eq, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  companies,
  companyMemberships,
  instanceUserRoles,
} from "@paperclipai/db";
import type { Config } from "../config.js";

export type BetterAuthSessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type BetterAuthSessionResult = {
  session: { id: string; userId: string } | null;
  user: BetterAuthSessionUser | null;
};

type BetterAuthInstance = ReturnType<typeof betterAuth>;

function headersFromNodeHeaders(rawHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, raw] of Object.entries(rawHeaders)) {
    if (!raw) continue;
    if (Array.isArray(raw)) {
      for (const value of raw) headers.append(key, value);
      continue;
    }
    headers.set(key, raw);
  }
  return headers;
}

function headersFromExpressRequest(req: Request): Headers {
  return headersFromNodeHeaders(req.headers);
}

export function deriveAuthTrustedOrigins(config: Config): string[] {
  const baseUrl = config.authBaseUrlMode === "explicit" ? config.authPublicBaseUrl : undefined;
  const trustedOrigins = new Set<string>();

  if (baseUrl) {
    try {
      trustedOrigins.add(new URL(baseUrl).origin);
    } catch {
      // Better Auth will surface invalid base URL separately.
    }
  }
  if (config.deploymentMode === "authenticated") {
    for (const hostname of config.allowedHostnames) {
      const trimmed = hostname.trim().toLowerCase();
      if (!trimmed) continue;
      trustedOrigins.add(`https://${trimmed}`);
      trustedOrigins.add(`http://${trimmed}`);
    }
  }

  return Array.from(trustedOrigins);
}

export function createBetterAuthInstance(db: Db, config: Config, trustedOrigins?: string[]): BetterAuthInstance {
  const baseUrl = config.authBaseUrlMode === "explicit" ? config.authPublicBaseUrl : undefined;
  const secret = process.env.BETTER_AUTH_SECRET ?? process.env.PAPERCLIP_AGENT_JWT_SECRET ?? "paperclip-dev-secret";
  const effectiveTrustedOrigins = trustedOrigins ?? deriveAuthTrustedOrigins(config);

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleEnabled = Boolean(googleClientId && googleClientSecret);

  const authConfig: Record<string, unknown> = {
    baseURL: baseUrl,
    secret,
    trustedOrigins: effectiveTrustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user: { id: string; name: string; email: string }) => {
            await ensureUserHasCompany(db, user);
          },
        },
      },
    },
  };

  if (googleEnabled) {
    authConfig.socialProviders = {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    };
  }

  if (!baseUrl) {
    delete authConfig.baseURL;
  }

  return betterAuth(authConfig as Parameters<typeof betterAuth>[0]);
}

/**
 * Auto-create a company and membership for a newly registered user.
 * Called from the better-auth databaseHooks after user creation.
 */
async function ensureUserHasCompany(
  db: Db,
  user: { id: string; name: string; email: string },
): Promise<void> {
  // Check if user already has a company membership
  const existing = await db
    .select({ id: companyMemberships.id })
    .from(companyMemberships)
    .where(
      and(
        eq(companyMemberships.principalType, "user"),
        eq(companyMemberships.principalId, user.id),
      ),
    )
    .then((rows) => rows[0] ?? null);
  if (existing) return;

  // Derive a company name from the user's name
  const companyName = user.name ? `${user.name}'s Workspace` : "My Workspace";

  // Derive unique issue prefix
  const FALLBACK = "CMP";
  const base = companyName.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) || FALLBACK;
  let company: { id: string } | undefined;
  let suffix = 1;
  while (suffix < 100) {
    const candidate = suffix <= 1 ? base : `${base}${"A".repeat(suffix - 1)}`;
    try {
      const rows = await db
        .insert(companies)
        .values({ name: companyName, issuePrefix: candidate })
        .returning({ id: companies.id });
      company = rows[0];
      break;
    } catch (error: unknown) {
      const code = typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
      if (code !== "23505") throw error;
    }
    suffix += 1;
  }
  if (!company) return;

  // Make user an instance admin (for their own instance in consumer mode)
  const hasAdminRole = await db
    .select({ id: instanceUserRoles.id })
    .from(instanceUserRoles)
    .where(and(eq(instanceUserRoles.userId, user.id), eq(instanceUserRoles.role, "instance_admin")))
    .then((rows) => rows[0] ?? null);
  if (!hasAdminRole) {
    await db.insert(instanceUserRoles).values({
      userId: user.id,
      role: "instance_admin",
    });
  }

  // Add user as company owner
  await db.insert(companyMemberships).values({
    companyId: company.id,
    principalType: "user",
    principalId: user.id,
    status: "active",
    membershipRole: "owner",
  });
}

export function createBetterAuthHandler(auth: BetterAuthInstance): RequestHandler {
  const handler = toNodeHandler(auth);
  return (req, res, next) => {
    void Promise.resolve(handler(req, res)).catch(next);
  };
}

export async function resolveBetterAuthSessionFromHeaders(
  auth: BetterAuthInstance,
  headers: Headers,
): Promise<BetterAuthSessionResult | null> {
  const api = (auth as unknown as { api?: { getSession?: (input: unknown) => Promise<unknown> } }).api;
  if (!api?.getSession) return null;

  const sessionValue = await api.getSession({
    headers,
  });
  if (!sessionValue || typeof sessionValue !== "object") return null;

  const value = sessionValue as {
    session?: { id?: string; userId?: string } | null;
    user?: { id?: string; email?: string | null; name?: string | null } | null;
  };
  const session = value.session?.id && value.session.userId
    ? { id: value.session.id, userId: value.session.userId }
    : null;
  const user = value.user?.id
    ? {
        id: value.user.id,
        email: value.user.email ?? null,
        name: value.user.name ?? null,
      }
    : null;

  if (!session || !user) return null;
  return { session, user };
}

export async function resolveBetterAuthSession(
  auth: BetterAuthInstance,
  req: Request,
): Promise<BetterAuthSessionResult | null> {
  return resolveBetterAuthSessionFromHeaders(auth, headersFromExpressRequest(req));
}
