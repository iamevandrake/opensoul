import type { Db } from "@paperclipai/db";
import { subscriptionPlans, subscriptions } from "@paperclipai/db";
import { eq, and } from "drizzle-orm";

// Stripe is loaded lazily so the server starts even without the SDK installed
let Stripe: typeof import("stripe").default | null = null;

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!Stripe) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Stripe = require("stripe").default ?? require("stripe");
    } catch {
      return null;
    }
  }
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" as string });
}

export function billingService(db: Db) {
  // ── Plan queries ──────────────────────────────────────────────
  async function listPlans() {
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true));
  }

  async function getPlanByName(name: string) {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, name))
      .limit(1);
    return plan ?? null;
  }

  // ── Subscription queries ──────────────────────────────────────
  async function getSubscription(companyId: string) {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.companyId, companyId))
      .limit(1);
    return sub ?? null;
  }

  async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1);
    return sub ?? null;
  }

  async function getSubscriptionByStripeCustomer(stripeCustomerId: string) {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
      .limit(1);
    return sub ?? null;
  }

  /**
   * Ensure every company has at least a Free plan subscription.
   */
  async function ensureSubscription(companyId: string) {
    const existing = await getSubscription(companyId);
    if (existing) return existing;

    const freePlan = await getPlanByName("Free");
    if (!freePlan) throw new Error("Free plan not found — run migrations");

    const [created] = await db
      .insert(subscriptions)
      .values({
        companyId,
        planId: freePlan.id,
        status: "active",
      })
      .onConflictDoNothing()
      .returning();

    return created ?? (await getSubscription(companyId))!;
  }

  // ── Entitlement checks ────────────────────────────────────────
  async function getEntitlements(companyId: string) {
    const sub = await ensureSubscription(companyId);
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, sub.planId))
      .limit(1);

    if (!plan) throw new Error("Subscription references missing plan");

    const isActive = ["active", "trialing"].includes(sub.status);
    const withinRunLimit =
      plan.maxRunsPerMonth === 0 || sub.runsThisPeriod < plan.maxRunsPerMonth;

    return {
      plan,
      subscription: sub,
      isActive,
      canRun: isActive && withinRunLimit,
      canUseAllTemplates: plan.allTemplates,
      maxTeams: plan.maxTeams,
      runsRemaining:
        plan.maxRunsPerMonth === 0
          ? Infinity
          : Math.max(0, plan.maxRunsPerMonth - sub.runsThisPeriod),
    };
  }

  /** Increment run counter for usage metering. */
  async function recordRun(companyId: string) {
    const sub = await getSubscription(companyId);
    if (!sub) return;

    await db
      .update(subscriptions)
      .set({
        runsThisPeriod: sub.runsThisPeriod + 1,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));
  }

  // ── Stripe Checkout ───────────────────────────────────────────
  async function createCheckoutSession(
    companyId: string,
    planId: string,
    userEmail: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    const stripe = getStripeClient();
    if (!stripe) throw new Error("Stripe is not configured");

    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);
    if (!plan || !plan.stripePriceId) throw new Error("Plan not found or has no Stripe price");

    // Reuse existing Stripe customer if one exists
    let sub = await getSubscription(companyId);
    const customerParams: Record<string, unknown> = {};
    if (sub?.stripeCustomerId) {
      customerParams.customer = sub.stripeCustomerId;
    } else {
      customerParams.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      ...customerParams,
      subscription_data: plan.trialDays > 0 ? { trial_period_days: plan.trialDays } : undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { companyId, planId },
    } as Parameters<typeof stripe.checkout.sessions.create>[0]);

    return { url: session.url, sessionId: session.id };
  }

  /** Create a Stripe Billing Portal session for self-service management. */
  async function createPortalSession(companyId: string, returnUrl: string) {
    const stripe = getStripeClient();
    if (!stripe) throw new Error("Stripe is not configured");

    const sub = await getSubscription(companyId);
    if (!sub?.stripeCustomerId) throw new Error("No Stripe customer for this company");

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // ── Stripe webhook handlers ───────────────────────────────────
  async function handleCheckoutCompleted(sessionData: {
    customer: string;
    subscription: string;
    metadata: { companyId?: string; planId?: string };
  }) {
    const { customer, subscription: subId, metadata } = sessionData;
    if (!metadata.companyId || !metadata.planId) return;

    const sub = await getSubscription(metadata.companyId);
    if (sub) {
      await db
        .update(subscriptions)
        .set({
          planId: metadata.planId,
          stripeCustomerId: customer,
          stripeSubscriptionId: subId,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.id));
    } else {
      await db.insert(subscriptions).values({
        companyId: metadata.companyId,
        planId: metadata.planId,
        stripeCustomerId: customer,
        stripeSubscriptionId: subId,
        status: "active",
      });
    }
  }

  async function handleSubscriptionUpdated(subData: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    trial_end: number | null;
    cancel_at_period_end: boolean;
  }) {
    const sub = await getSubscriptionByStripeId(subData.id);
    if (!sub) return;

    await db
      .update(subscriptions)
      .set({
        status: subData.status,
        currentPeriodStart: new Date(subData.current_period_start * 1000),
        currentPeriodEnd: new Date(subData.current_period_end * 1000),
        trialEnd: subData.trial_end ? new Date(subData.trial_end * 1000) : null,
        cancelAtPeriodEnd: subData.cancel_at_period_end,
        // Reset run counter on period renewal
        ...(subData.current_period_start * 1000 > (sub.currentPeriodStart?.getTime() ?? 0)
          ? { runsThisPeriod: 0 }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));
  }

  async function handleSubscriptionDeleted(subData: { id: string }) {
    const sub = await getSubscriptionByStripeId(subData.id);
    if (!sub) return;

    // Downgrade to Free plan
    const freePlan = await getPlanByName("Free");
    if (!freePlan) return;

    await db
      .update(subscriptions)
      .set({
        planId: freePlan.id,
        status: "active",
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialEnd: null,
        runsThisPeriod: 0,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));
  }

  return {
    listPlans,
    getPlanByName,
    getSubscription,
    ensureSubscription,
    getEntitlements,
    recordRun,
    createCheckoutSession,
    createPortalSession,
    handleCheckoutCompleted,
    handleSubscriptionUpdated,
    handleSubscriptionDeleted,
  };
}
