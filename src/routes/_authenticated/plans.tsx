import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getBillingStatus, openPortal, startCheckout } from "@/lib/billing.functions";
import {
  PLAN_CATALOGUE,
  PLAN_CURRENCY,
  isPaidTier,
  type BillingInterval,
  type PaidTier,
  type PlanTier,
} from "@/lib/billing/plans";
import { getEntitlements } from "@/lib/entitlements.functions";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "Plans — Kalm" },
      { name: "description", content: "Kalm plans and pricing." },
      { property: "og:title", content: "Plans — Kalm" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchEntitlements = useServerFn(getEntitlements);
  const { data: entitlements, isPending } = useQuery({
    queryKey: ["entitlements"],
    queryFn: () => fetchEntitlements(),
  });

  const fetchBilling = useServerFn(getBillingStatus);
  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => fetchBilling(),
  });
  const checkout = useServerFn(startCheckout);
  const portal = useServerFn(openPortal);
  const [interval, setBillingInterval] = useState<BillingInterval>("monthly");

  const goTo = (result: { url: string }) => window.location.assign(result.url);
  const checkoutMutation = useMutation({
    mutationFn: (tierToBuy: PaidTier) => checkout({ data: { tier: tierToBuy, interval } }),
    onSuccess: goTo,
    onError: () => toast.error(t("plans.checkoutFailed")),
  });
  const portalMutation = useMutation({
    mutationFn: () => portal(),
    onSuccess: goTo,
    onError: () => toast.error(t("plans.manageFailed")),
  });

  const tier = (entitlements?.tier ?? "free") as "free" | "pro" | "premium" | "org";
  const billingOn = billing?.enabled === true;
  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: PLAN_CURRENCY,
    maximumFractionDigits: 0,
  });
  // The real, enforced numbers (chat-limits.ts) — never hard-coded in the copy.
  const benefitCount = (planTier: PlanTier, key: "b1" | "b2" | "b3"): number | null => {
    const limits = billing?.limits;
    if (!limits || key === "b3") return null;
    if (planTier === "free") return key === "b2" ? limits.freeIntroMessages : null;
    const plan = limits[planTier];
    return key === "b1" ? plan.dailyMessages : plan.weeklyCalls;
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl">{t("plans.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("plans.subtitle")}</p>
        </header>

        <section className="surface-soft p-6 text-sm">
          {billing && !billingOn && (
            <>
              <h2 className="text-lg">{t("plans.comingSoonTitle")}</h2>
              <p className="mt-1 text-muted-foreground">{t("plans.comingSoonBody")}</p>
            </>
          )}
          {isPending ? (
            <Skeleton className="mt-4 h-6 w-40 rounded-lg" />
          ) : (
            <p className="mt-4">
              <span className="text-muted-foreground">{t("plans.currentPlan")}: </span>
              <span className="font-medium">{t(`plans.tiers.${tier}.name`)}</span>
            </p>
          )}
        </section>

        <section className="space-y-4">
          <div className="inline-flex rounded-full border border-border p-1 text-sm" role="group">
            {(["monthly", "yearly"] as BillingInterval[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={interval === option}
                onClick={() => setBillingInterval(option)}
                className={`rounded-full px-4 py-1.5 ${
                  interval === option ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                {t(`plans.${option}`)}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PLAN_CATALOGUE.map((plan) => {
              const isCurrent = tier === plan.tier;
              return (
                <article key={plan.tier} className="surface-soft flex flex-col p-6 text-sm">
                  <h2 className="text-xl">{t(`plans.tiers.${plan.tier}.name`)}</h2>
                  <p className="text-muted-foreground">{t(`plans.catalog.${plan.tier}.tagline`)}</p>
                  <p className="mt-4 text-2xl">
                    {plan.price[interval] === 0 ? (
                      t("plans.freePrice")
                    ) : (
                      <>
                        {money.format(plan.price[interval])}{" "}
                        <span className="text-sm text-muted-foreground">
                          {interval === "monthly" ? t("plans.perMonth") : t("plans.perYear")}
                        </span>
                      </>
                    )}
                  </p>
                  <ul className="mt-4 flex-1 list-disc space-y-1.5 ps-5">
                    {(["b1", "b2", "b3"] as const).map((key) => {
                      const n = benefitCount(plan.tier, key);
                      // Limit lines wait for the real numbers to load.
                      const needsNumber = plan.tier === "free" ? key === "b2" : key !== "b3";
                      if (needsNumber && n === null) return null;
                      return (
                        <li key={key}>{t(`plans.catalog.${plan.tier}.${key}`, { n: n ?? 0 })}</li>
                      );
                    })}
                  </ul>
                  <div className="mt-5">
                    {plan.tier === "free" || !isPaidTier(plan.tier) ? null : isCurrent ? (
                      billingOn ? (
                        <Button
                          variant="ghost"
                          disabled={portalMutation.isPending}
                          onClick={() => portalMutation.mutate()}
                        >
                          {t("plans.manage")}
                        </Button>
                      ) : (
                        <Button variant="ghost" disabled>
                          {t("plans.thisIsYourPlan")}
                        </Button>
                      )
                    ) : (
                      <Button
                        className="w-full"
                        disabled={!billingOn || checkoutMutation.isPending}
                        onClick={() => checkoutMutation.mutate(plan.tier as PaidTier)}
                      >
                        {billingOn
                          ? t("plans.choose", { plan: t(`plans.tiers.${plan.tier}.name`) })
                          : t("plans.launchingSoon")}
                      </Button>
                    )}
                    {isCurrent && plan.tier === "free" && (
                      <p className="text-muted-foreground">{t("plans.thisIsYourPlan")}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {entitlements && (
          <section className="surface-soft p-6 text-sm">
            <h2 className="text-lg">{t("plans.usageTitle")}</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">
                  {entitlements.chat.intro ? t("plans.usageIntro") : t("plans.usageMessages")}
                </dt>
                <dd className="mt-1 font-medium">
                  {entitlements.chat.intro
                    ? `${entitlements.chat.intro.used} / ${entitlements.chat.intro.limit}`
                    : `${entitlements.chat.usedToday} / ${entitlements.chat.dailyLimit}`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("plans.usageCalls")}</dt>
                <dd className="mt-1 font-medium">
                  {entitlements.voice.enabled
                    ? `${entitlements.voice.usedThisWeek} / ${entitlements.voice.weeklyLimit}`
                    : t("plans.usageCallsNone")}
                </dd>
              </div>
            </dl>
            {entitlements.voice.nextCallAvailableAt && (
              <p className="mt-4 text-muted-foreground">
                {t("plans.nextCall", {
                  date: new Date(entitlements.voice.nextCallAvailableAt).toLocaleDateString(),
                })}
              </p>
            )}
            <div className="mt-5">
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/support" })}>
                {t("plans.contactSupport")}
              </Button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
