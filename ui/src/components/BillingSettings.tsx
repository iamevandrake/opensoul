import { useQuery, useMutation } from "@tanstack/react-query";
import { billingApi, type Entitlements, type SubscriptionPlan } from "../api/billing";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Check,
  Loader2,
  ExternalLink,
  Zap,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../lib/utils";

interface BillingSettingsProps {
  companyId: string;
}

export function BillingSettings({ companyId }: BillingSettingsProps) {
  const { data: entitlements, isLoading: loadingSub } = useQuery({
    queryKey: ["billing", "subscription", companyId],
    queryFn: () => billingApi.getSubscription(companyId),
    enabled: !!companyId,
  });

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => billingApi.listPlans(),
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) =>
      billingApi.createCheckout(companyId, {
        planId,
        successUrl: `${window.location.origin}/settings?billing=success`,
        cancelUrl: `${window.location.origin}/settings?billing=cancel`,
      }),
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      billingApi.createPortal(companyId, {
        returnUrl: `${window.location.origin}/settings`,
      }),
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  if (loadingSub || loadingPlans) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading billing...
      </div>
    );
  }

  const currentPlan = entitlements?.plan;
  const sub = entitlements?.subscription;
  const isFree = currentPlan?.monthlyPriceCents === 0;
  const isTrialing = sub?.status === "trialing";

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="bg-muted/50 p-2 rounded-md">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Billing & Subscription</h3>
            <p className="text-xs text-muted-foreground">
              Manage your plan and payment method
            </p>
          </div>
        </div>

        {currentPlan && (
          <div
            className={cn(
              "rounded-md border px-4 py-3",
              isFree
                ? "border-border bg-muted/30"
                : "border-green-300 bg-green-50 dark:border-green-500/25 dark:bg-green-950/40",
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isFree ? (
                  <Zap className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
                <span className="font-medium text-sm">
                  {currentPlan.name} Plan
                </span>
                {isTrialing && (
                  <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-1.5 py-0.5 rounded">
                    Trial
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {currentPlan.monthlyPriceCents === 0
                  ? "Free"
                  : `$${(currentPlan.monthlyPriceCents / 100).toFixed(2)}/mo`}
              </span>
            </div>

            {sub?.cancelAtPeriodEnd && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Cancels at end of billing period
                {sub.currentPeriodEnd &&
                  ` (${new Date(sub.currentPeriodEnd).toLocaleDateString()})`}
              </div>
            )}
          </div>
        )}

        {/* Usage meter */}
        {entitlements && currentPlan && currentPlan.maxRunsPerMonth > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Agent runs this period</span>
              <span>
                {sub?.runsThisPeriod ?? 0} / {currentPlan.maxRunsPerMonth}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((sub?.runsThisPeriod ?? 0) / currentPlan.maxRunsPerMonth) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Plan cards */}
      {plans && isFree && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Upgrade</h4>
          <div className="grid gap-3">
            {plans
              .filter((p) => p.monthlyPriceCents > 0)
              .map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onSelect={() => checkoutMutation.mutate(plan.id)}
                  loading={checkoutMutation.isPending}
                />
              ))}
          </div>
        </div>
      )}

      {/* Manage subscription (Stripe portal) */}
      {!isFree && sub?.stripeCustomerId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => portalMutation.mutate()}
          disabled={portalMutation.isPending}
        >
          {portalMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-1.5" />
          )}
          Manage Subscription
        </Button>
      )}

      {checkoutMutation.isError && (
        <p className="text-sm text-destructive">
          {checkoutMutation.error instanceof Error
            ? checkoutMutation.error.message
            : "Failed to start checkout"}
        </p>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onSelect,
  loading,
}: {
  plan: SubscriptionPlan;
  onSelect: () => void;
  loading: boolean;
}) {
  const features = [
    plan.maxTeams === -1 ? "Unlimited teams" : `${plan.maxTeams} team${plan.maxTeams > 1 ? "s" : ""}`,
    plan.maxRunsPerMonth === 0 ? "Unlimited agent runs" : `${plan.maxRunsPerMonth} runs/month`,
    plan.allTemplates ? "All templates" : "Basic templates",
    plan.trialDays > 0 ? `${plan.trialDays}-day free trial` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{plan.name}</span>
          <span className="text-sm text-muted-foreground ml-2">
            ${(plan.monthlyPriceCents / 100).toFixed(2)}/mo
          </span>
        </div>
        <Button size="sm" onClick={onSelect} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Upgrade"
          )}
        </Button>
      </div>
      <ul className="space-y-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3 text-green-500 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
