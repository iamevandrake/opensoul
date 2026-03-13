import { api } from "./client";

export interface SubscriptionPlan {
  id: string;
  name: string;
  stripePriceId: string | null;
  monthlyPriceCents: number;
  maxTeams: number;
  maxRunsPerMonth: number;
  allTemplates: boolean;
  trialDays: number;
  active: boolean;
}

export interface Entitlements {
  plan: SubscriptionPlan;
  subscription: {
    id: string;
    companyId: string;
    planId: string;
    stripeCustomerId: string | null;
    status: string;
    runsThisPeriod: number;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
  };
  isActive: boolean;
  canRun: boolean;
  canUseAllTemplates: boolean;
  maxTeams: number;
  runsRemaining: number;
}

export const billingApi = {
  listPlans: () => api.get<SubscriptionPlan[]>("/billing/plans"),

  getSubscription: (companyId: string) =>
    api.get<Entitlements>(`/companies/${companyId}/billing/subscription`),

  createCheckout: (
    companyId: string,
    data: { planId: string; successUrl: string; cancelUrl: string },
  ) => api.post<{ url: string; sessionId: string }>(`/companies/${companyId}/billing/checkout`, data),

  createPortal: (companyId: string, data: { returnUrl: string }) =>
    api.post<{ url: string }>(`/companies/${companyId}/billing/portal`, data),
};
