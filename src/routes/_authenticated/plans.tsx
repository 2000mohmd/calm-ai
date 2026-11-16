import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getEntitlements } from "@/lib/entitlements.functions";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "Plans — Kalm" },
      { name: "description", content: "Kalm plans are coming soon." },
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

  const tier = (entitlements?.tier ?? "free") as "free" | "pro" | "premium" | "org";

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl">{t("plans.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("plans.subtitle")}</p>
        </header>

        <section className="surface-soft p-6 text-sm">
          <h2 className="text-lg">{t("plans.comingSoonTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("plans.comingSoonBody")}</p>
          {isPending ? (
            <Skeleton className="mt-4 h-6 w-40 rounded-lg" />
          ) : (
            <p className="mt-4">
              <span className="text-muted-foreground">{t("plans.currentPlan")}: </span>
              <span className="font-medium">{t(`plans.tiers.${tier}.name`)}</span>
            </p>
          )}
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
