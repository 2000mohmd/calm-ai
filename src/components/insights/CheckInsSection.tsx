import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getScreenerState, submitScreener } from "@/lib/screeners.functions";
import { SCREENERS, SCREENER_CHOICES, maxScore, type ScreenerType } from "@/lib/screeners";
import type { CrisisResponse } from "@/lib/crisis";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";

const SEVERITY_KEYS: Record<string, string> = {
  minimal: "screeners.severity.minimal",
  mild: "screeners.severity.mild",
  moderate: "screeners.severity.moderate",
  "moderately severe": "screeners.severity.moderatelySevere",
  severe: "screeners.severity.severe",
};

/**
 * PHQ-9 / GAD-7 check-ins, history and the item-9 crisis view.
 * Shared by /check-ins and the "Check-ins" tab of /insights.
 */
export function CheckInsSection({ showHeader = true }: { showHeader?: boolean }) {
  const { t } = useTranslation();
  const severityLabel = (severity: string) => t(SEVERITY_KEYS[severity] ?? severity);
  const queryClient = useQueryClient();
  const fetchState = useServerFn(getScreenerState);
  const submit = useServerFn(submitScreener);

  const { data, isPending } = useQuery({
    queryKey: ["screeners"],
    queryFn: () => fetchState(),
  });

  const [activeType, setActiveType] = useState<ScreenerType | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [crisis, setCrisis] = useState<CrisisResponse | null>(null);

  const save = useMutation({
    mutationFn: () =>
      submit({
        data: {
          screener_type: activeType as ScreenerType,
          responses: answers.map((value) => value ?? 0),
        },
      }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["screeners"] });
      await queryClient.invalidateQueries({ queryKey: ["nudges"] });
      setActiveType(null);
      setAnswers([]);
      if (result.crisisTriggered && result.crisis) {
        setCrisis(result.crisis);
        return;
      }
      toast.success(
        t("screeners.savedToast", {
          score: result.total_score,
          severity: severityLabel(result.severity),
        }),
      );
    },
    onError: () => toast.error(t("common.saveFailed")),
  });

  if (crisis) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl border border-crisis/40 bg-crisis-surface p-6 text-crisis">
          <h2 className="text-2xl">{t("screeners.crisis.title")}</h2>
          <p className="mt-3">{crisis.message}</p>
        </div>
        <ul className="space-y-3">
          {crisis.resources.map((resource) => (
            <li key={resource.name} className="surface-soft p-5">
              <p className="font-semibold">{resource.name}</p>
              <p className="mt-1 text-sm">{resource.contact}</p>
              <p className="mt-1 text-sm text-muted-foreground">{resource.detail}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{crisis.disclaimer}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full px-6">
            <Link to="/crisis">{t("screeners.crisis.seeAllResources")}</Link>
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => setCrisis(null)}>
            {t("screeners.crisis.backToCheckIns")}
          </Button>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (activeType) {
    const screener = SCREENERS[activeType];
    const complete = answers.length === screener.items.length && answers.every((v) => v !== null);
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h2 className="text-2xl sm:text-3xl">{t(`screeners.${activeType}.label`)}</h2>
          <p className="mt-2 text-muted-foreground">{t(`screeners.${activeType}.prompt`)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("screeners.framing")}</p>
        </header>

        <ol className="space-y-4">
          {screener.items.map((_item, index) => (
            <li key={index} className="surface-soft p-5">
              <p className="text-sm">
                {index + 1}. {t(`screeners.${activeType}.items.${index}`)}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {SCREENER_CHOICES.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => {
                        const next = [...prev];
                        while (next.length < screener.items.length) next.push(null);
                        next[index] = choice.value;
                        return next;
                      })
                    }
                    className={`rounded-2xl border px-2 py-2 text-xs ${
                      answers[index] === choice.value
                        ? "border-primary bg-secondary font-semibold"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    {t(`screeners.choices.${choice.value}`)}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <div className="flex gap-3">
          <Button
            className="rounded-full px-6"
            disabled={!complete || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? t("common.saving") : t("screeners.saveButton")}
          </Button>
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => {
              setActiveType(null);
              setAnswers([]);
            }}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showHeader && (
        <header>
          <h1 className="text-3xl sm:text-4xl">{t("screeners.title")}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {t("screeners.subtitle")} {t("screeners.framing")}
          </p>
        </header>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {(data?.screeners ?? []).map((entry) => (
          <div key={entry.type} className="surface-soft space-y-4 p-6">
            <div>
              <h2 className="text-lg">{t(`screeners.${entry.type}.label`)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {entry.latest
                  ? t("screeners.lastTaken", {
                      date: new Date(entry.latest.taken_at).toLocaleDateString(),
                      score: entry.latest.total_score,
                      max: maxScore(entry.type),
                      severity: severityLabel(entry.latest.severity),
                    })
                  : t("screeners.notTakenYet")}
              </p>
              {entry.dueAt && !entry.due && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("screeners.nextSuggested", {
                    date: new Date(entry.dueAt).toLocaleDateString(),
                  })}
                </p>
              )}
            </div>

            {entry.history.length > 1 && (
              <div className="flex h-20 items-end gap-1.5">
                {entry.history.slice(-12).map((row) => (
                  <div key={row.id} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md bg-primary/70"
                      style={{
                        height: `${Math.max(6, (row.total_score / maxScore(entry.type)) * 100)}%`,
                      }}
                      aria-hidden
                    />
                    <span className="text-[10px] text-muted-foreground">{row.total_score}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant={entry.due ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setActiveType(entry.type);
                setAnswers(new Array(SCREENERS[entry.type].items.length).fill(null));
              }}
            >
              {entry.due ? t("screeners.takeNow") : t("screeners.takeAgain")}
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
