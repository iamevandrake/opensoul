import { pgTable, uuid, text, timestamp, integer, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

/**
 * Subscription plans / pricing tiers.
 * Seeded at boot with Free + Pro definitions.
 */
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),              // "Free", "Pro"
  stripePriceId: text("stripe_price_id"),     // Stripe Price ID (null for free tier)
  monthlyPriceCents: integer("monthly_price_cents").notNull().default(0),
  maxTeams: integer("max_teams").notNull().default(1),
  maxRunsPerMonth: integer("max_runs_per_month").notNull().default(0), // 0 = unlimited
  allTemplates: boolean("all_templates").notNull().default(false),
  trialDays: integer("trial_days").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Company subscriptions — one active subscription per company.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    planId: uuid("plan_id").notNull().references(() => subscriptionPlans.id),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: text("status").notNull().default("active"),  // active, trialing, past_due, canceled, incomplete
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    runsThisPeriod: integer("runs_this_period").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: uniqueIndex("subscriptions_company_idx").on(table.companyId),
    stripeCustomerIdx: index("subscriptions_stripe_customer_idx").on(table.stripeCustomerId),
    stripeSubIdx: index("subscriptions_stripe_sub_idx").on(table.stripeSubscriptionId),
  }),
);
