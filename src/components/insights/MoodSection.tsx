import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Sparkles, Wind } from "lucide-react";
import { getMyProfile } from "@/lib/onboarding.functions";
import { logMood } from "@/lib/mood.functions";
import { NudgeFeed } from "@/components/NudgeFeed";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";

const MOOD_KEYS = [
  { score: 1, key: "reallyLow" },
  { score: 2, key: "low" },
  { score: 3, key: "okay" },
  { score: 4, key: "good" },
  { score: 5, key: "great" },
] as const;

/**
 * Mood check-in, nudges and recent trend. Shared by /dashboard and the
 * "Mood & Trends" tab of /insights.
 */
export function MoodSection({ showGreeting = true }: { showGreeting?: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const saveMood = useServerFn(logMood);

  const MOODS = MOOD_KEYS.map((mood) => ({
    score: mood.score,
    label: t(`mood.options.${mood.key}`),
  }));

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return t("mood.checkIn.greetingMorning");
    if (hour < 18) return t("mood.checkIn.greetingAfternoon");
    return t("mood.checkIn.greetingEvening");
  }

  const { data, isPending } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });

  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (data && !data.profile?.onboarding_completed) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [data, navigate]);

  const mutation = useMutation({
    mutationFn: () => saveMood({ data: { score: score ?? 3, note, tags: [] } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      setScore(null);
      setNote("");
      toast.success(t("mood.checkIn.savedToast"));
    },
    onError: () => toast.error(t("mood.checkIn.errorToast")),
  });

  const moods = data?.recentMoods ?? [];
  const average =
    moods.length > 0
      ? (moods.reduce((total, entry) => total + entry.score, 0) / moods.length).toFixed(1)
      : null;

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showGreeting && (
        <header>
          <h1 className="text-3xl sm:text-4xl">
            {greeting()}
            {data?.profile?.preferred_name ? `, ${data.profile.preferred_name}` : ""}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("mood.checkIn.subtitle")}</p>
        </header>
      )}

      <NudgeFeed />

      <section className="surface-soft p-6 sm:p-8">
        <h2 className="text-xl">{t("mood.checkIn.prompt")}</h2>
        <div className="mt-5 grid grid-cols-5 gap-2">
          {MOODS.map((option) => (
            <button
              key={option.score}
              type="button"
              onClick={() => setScore(option.score)}
              className={`rounded-2xl border px-1 py-4 text-center text-xs sm:text-sm ${
                score === option.score
                  ? "border-primary bg-secondary font-semibold"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {score !== null && (
          <div className="mt-5 space-y-4">
            <Textarea
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("mood.checkIn.notePlaceholder")}
            />
            <Button
              className="rounded-full px-6"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? t("common.saving") : t("mood.checkIn.saveButton")}
            </Button>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="surface-soft p-6">
          <h2 className="text-lg">{t("mood.checkIn.recentTitle", { count: moods.length || 0 })}</h2>
          {moods.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t("mood.checkIn.emptyTrend")}</p>
          ) : (
            <>
              <div className="mt-5 flex h-24 items-end gap-2">
                {[...moods].reverse().map((entry) => (
                  <div key={entry.id} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-primary/70"
                      style={{ height: `${(entry.score / 5) * 100}%` }}
                      aria-hidden
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.logged_at).toLocaleDateString(undefined, {
                        month: "numeric",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {t("mood.checkIn.averageNote", { average: average ?? "" })}
              </p>
            </>
          )}
        </div>

        <div className="surface-soft p-6">
          <h2 className="text-lg">{t("mood.checkIn.whereNextTitle")}</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Wind className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <Link to="/exercises" className="underline underline-offset-4">
                {t("mood.checkIn.guidedExercisesLink")}
              </Link>{" "}
              {t("mood.checkIn.guidedExercisesDesc")}
            </li>
            <li className="flex items-start gap-3">
              <ClipboardList className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <Link to="/check-ins" className="underline underline-offset-4">
                {t("mood.checkIn.periodicCheckInsLink")}
              </Link>{" "}
              {t("mood.checkIn.periodicCheckInsDesc")}
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <Link to="/care" className="underline underline-offset-4">
                {t("mood.checkIn.talkToPersonLink")}
              </Link>{" "}
              {t("mood.checkIn.talkToPersonDesc")}
            </li>
          </ul>
          <Link
            to="/settings"
            className="mt-5 inline-block text-sm font-semibold text-primary underline underline-offset-4"
          >
            {t("mood.checkIn.reviewProfileLink")}
          </Link>
        </div>
      </section>
    </div>
  );
}
