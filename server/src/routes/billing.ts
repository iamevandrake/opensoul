import { Router, raw } from "express";
import type { Db } from "@paperclipai/db";
import { billingService, logActivity } from "../services/index.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";

export function billingRoutes(db: Db) {
  const router = Router();
  const svc = billingService(db);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // ── Public: list available plans ──────────────────────────────
  router.get("/billing/plans", async (_req, res) => {
    const plans = await svc.listPlans();
    res.json(plans);
  });

  // ── Company subscription + entitlements ───────────────────────
  router.get("/companies/:companyId/billing/subscription", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const entitlements = await svc.getEntitlements(companyId);
    res.json(entitlements);
  });

  // ── Stripe Checkout: create session ───────────────────────────
  router.post("/companies/:companyId/billing/checkout", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const { planId, successUrl, cancelUrl } = req.body as {
      planId: string;
      successUrl: string;
      cancelUrl: string;
    };

    if (!planId || !successUrl || !cancelUrl) {
      res.status(400).json({ error: "planId, successUrl, and cancelUrl are required" });
      return;
    }

    // Get the user's email for Stripe customer creation
    const userEmail = (req as any).actor?.email ?? "unknown@example.com";

    try {
      const session = await svc.createCheckoutSession(
        companyId,
        planId,
        userEmail,
        successUrl,
        cancelUrl,
      );
      res.json(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      res.status(400).json({ error: msg });
    }
  });

  // ── Stripe Billing Portal ─────────────────────────────────────
  router.post("/companies/:companyId/billing/portal", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const { returnUrl } = req.body as { returnUrl: string };
    if (!returnUrl) {
      res.status(400).json({ error: "returnUrl is required" });
      return;
    }

    try {
      const session = await svc.createPortalSession(companyId, returnUrl);
      res.json(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Portal session failed";
      res.status(400).json({ error: msg });
    }
  });

  // ── Stripe Webhook ────────────────────────────────────────────
  router.post("/billing/webhook", raw({ type: "application/json" }), async (req, res) => {
    let event: { type: string; data: { object: any } };

    if (webhookSecret) {
      // Verify signature in production
      let Stripe: any;
      try {
        Stripe = require("stripe").default ?? require("stripe");
      } catch {
        res.status(500).json({ error: "Stripe SDK not available" });
        return;
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const sig = req.headers["stripe-signature"] as string;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret) as typeof event;
      } catch (err) {
        res.status(400).json({ error: "Webhook signature verification failed" });
        return;
      }
    } else {
      // Dev mode: trust the payload
      event = req.body as typeof event;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await svc.handleCheckoutCompleted(event.data.object);
          break;
        case "customer.subscription.updated":
          await svc.handleSubscriptionUpdated(event.data.object);
          break;
        case "customer.subscription.deleted":
          await svc.handleSubscriptionDeleted(event.data.object);
          break;
      }
    } catch (err) {
      console.error("[billing webhook]", event.type, err);
    }

    res.json({ received: true });
  });

  return router;
}
