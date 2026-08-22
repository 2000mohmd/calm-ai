import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Leaf } from "lucide-react";
import { completeOnboarding, getMyProfile, updateMyLanguage } from "@/lib/onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { SafetyFooter } from "@/components/SafetyFooter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation, type Language } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your Kalm profile" },
      {
        name: "description",
        content: "Tell Kalm who you are so your companion feels personal from the first message.",
      },
      { property: "og:title", content: "Set up your Kalm profile" },
      {
        property: "og:description",
        content: "Consent, mode selection, self-introduction and your baseline mood check-in.",
      },
    ],
  }),
  component: OnboardingPage,
});

const MODE_DEFS = [
  { value: "general" as const, titleKey: "general", bodyKey: "general" },
  { value: "condition" as const, titleKey: "condition", bodyKey: "condition" },
  { value: "teen" as const, titleKey: "teen", bodyKey: "teen" },
  { value: "org_member" as const, titleKey: "orgMember", bodyKey: "orgMember" },
];

const GOAL_KEYS = [
  "lessAnxious",
  "sleepBetter",
  "dailyHabit",
  "understandPatterns",
  "workStress",
  "beKinder",
] as const;

const STRESSOR_KEYS = [
  "work",
  "school",
  "family",
  "money",
  "health",
  "relationships",
  "loneliness",
] as const;

const MOOD_DEFS = [
  { score: 1, key: "reallyLow" },
  { score: 2, key: "low" },
  { score: 3, key: "okay" },
  { score: 4, key: "good" },
  { score: 5, key: "great" },
] as const;

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const saveOnboarding = useServerFn(completeOnboarding);
  const saveLanguage = useServerFn(updateMyLanguage);

  const MODES = MODE_DEFS.map((mode) => ({
    value: mode.value,
    title: t(`onboarding.modeStep.${mode.titleKey}.title`),
    body: t(`onboarding.modeStep.${mode.bodyKey}.body`),
  }));
  const GOALS = GOAL_KEYS.map((key) => t(`onboarding.aboutStep.goals.${key}`));
  const STRESSORS = STRESSOR_KEYS.map((key) => t(`onboarding.aboutStep.stressors.${key}`));
  const MOODS = MOOD_DEFS.map((mood) => ({
    score: mood.score,
    label: t(`onboarding.moodStep.options.${mood.key}`),
  }));
  const STEPS = [
    t("onboarding.steps.consent"),
    t("onboarding.steps.mode"),
    t("onboarding.steps.aboutYou"),
    t("onboarding.steps.firstCheckIn"),
  ];

  const { data } = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });

  const [step, setStep] = useState(0);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [aiContextConsent, setAiContextConsent] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [accountType, setAccountType] = useState<(typeof MODES)[number]["value"]>("general");
  const [preferredName, setPreferredName] = useState("");
  const [introText, setIntroText] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [stressors, setStressors] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [communication, setCommunication] = useState("");
  const [avoid, setAvoid] = useState("");
  const [inCare, setInCare] = useState(false);
  const [mood, setMood] = useState<number | null>(null);

  useEffect(() => {
    if (data?.profile?.onboarding_completed) {
      navigate({ to: "/chat", replace: true });
    }
    if (data?.profile?.preferred_name && !preferredName) {
      setPreferredName(data.profile.preferred_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const languageMutation = useMutation({
    mutationFn: (language: Language) => saveLanguage({ data: { language } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-profile"] }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      saveOnboarding({
        data: {
          preferred_name: preferredName.trim(),
          account_type: accountType,
          privacy_consent: true as const,
          ai_context_consent: aiContextConsent,
          age_confirmed_13_plus: true as const,
          intro_text: introText.trim(),
          goals,
          stressors,
          existing_diagnosis: diagnosis.trim(),
          communication_preference: communication.trim(),
          topics_to_avoid: avoid.trim(),
          in_professional_care: inCare,
          baseline_mood: mood ?? 3,
          baseline_tags: [],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success(t("onboarding.successToast"));
      navigate({ to: "/chat", replace: true });
    },
    onError: () => toast.error(t("onboarding.errorToast")),
  });

  const canContinue = [
    privacyConsent && ageConfirmed,
    Boolean(accountType),
    preferredName.trim().length > 0,
    mood !== null,
  ][step];

  return (
    <div className="flex min-h-screen flex-col breathe-gradient">
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-display text-xl">
            <Leaf className="size-5 text-primary" aria-hidden />
            Kalm
          </div>
          <LanguageSwitcher
            className="w-auto"
            onChange={(language) => languageMutation.mutate(language)}
          />
        </div>

        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
        <p className="mt-3 text-sm text-muted-foreground">
          {t("onboarding.stepLabel", {
            current: step + 1,
            total: STEPS.length,
            name: STEPS[step] ?? "",
          })}
        </p>

        <div className="surface-soft mt-6 p-7">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl">{t("onboarding.consentStep.title")}</h1>
                <p className="mt-3 text-muted-foreground">{t("onboarding.consentStep.body")}</p>
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={privacyConsent}
                  onCheckedChange={(value) => setPrivacyConsent(value === true)}
                  className="mt-1"
                />
                <span>{t("onboarding.consentStep.privacyLabel")}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={ageConfirmed}
                  onCheckedChange={(value) => setAgeConfirmed(value === true)}
                  className="mt-1"
                />
                <span>{t("onboarding.consentStep.ageLabel")}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={aiContextConsent}
                  onCheckedChange={(value) => setAiContextConsent(value === true)}
                  className="mt-1"
                />
                <span>{t("onboarding.consentStep.aiConsentLabel")}</span>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-3xl">{t("onboarding.modeStep.title")}</h1>
                <p className="mt-3 text-muted-foreground">{t("onboarding.modeStep.body")}</p>
              </div>
              <div className="space-y-3">
                {MODES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccountType(option.value)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-5 text-left ${
                      accountType === option.value
                        ? "border-primary bg-secondary"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <span className="flex-1">
                      <span className="block font-semibold">{option.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {option.body}
                      </span>
                    </span>
                    {accountType === option.value && (
                      <Check className="mt-1 size-5 text-primary" aria-hidden />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl">{t("onboarding.aboutStep.title")}</h1>
                <p className="mt-3 text-muted-foreground">{t("onboarding.aboutStep.body")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t("onboarding.aboutStep.nameLabel")}</Label>
                <Input
                  id="name"
                  value={preferredName}
                  maxLength={60}
                  onChange={(event) => setPreferredName(event.target.value)}
                  placeholder={t("onboarding.aboutStep.namePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="intro">{t("onboarding.aboutStep.introLabel")}</Label>
                <Textarea
                  id="intro"
                  value={introText}
                  maxLength={2000}
                  rows={5}
                  onChange={(event) => setIntroText(event.target.value)}
                  placeholder={t("onboarding.aboutStep.introPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("onboarding.aboutStep.goalsLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((goal) => (
                    <Chip
                      key={goal}
                      label={goal}
                      active={goals.includes(goal)}
                      onClick={() => setGoals(toggle(goals, goal))}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("onboarding.aboutStep.stressorsLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {STRESSORS.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      active={stressors.includes(item)}
                      onClick={() => setStressors(toggle(stressors, item))}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="communication">
                  {t("onboarding.aboutStep.communicationLabel")}
                </Label>
                <Input
                  id="communication"
                  value={communication}
                  maxLength={120}
                  onChange={(event) => setCommunication(event.target.value)}
                  placeholder={t("onboarding.aboutStep.communicationPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avoid">{t("onboarding.aboutStep.avoidLabel")}</Label>
                <Input
                  id="avoid"
                  value={avoid}
                  maxLength={500}
                  onChange={(event) => setAvoid(event.target.value)}
                  placeholder={t("onboarding.aboutStep.avoidPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">{t("onboarding.aboutStep.diagnosisLabel")}</Label>
                <Input
                  id="diagnosis"
                  value={diagnosis}
                  maxLength={200}
                  onChange={(event) => setDiagnosis(event.target.value)}
                  placeholder={t("onboarding.aboutStep.diagnosisPlaceholder")}
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={inCare}
                  onCheckedChange={(value) => setInCare(value === true)}
                  className="mt-1"
                />
                <span>{t("onboarding.aboutStep.inCareLabel")}</span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl">{t("onboarding.moodStep.title")}</h1>
                <p className="mt-3 text-muted-foreground">{t("onboarding.moodStep.body")}</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {MOODS.map((option) => (
                  <button
                    key={option.score}
                    type="button"
                    onClick={() => setMood(option.score)}
                    className={`rounded-2xl border px-2 py-5 text-center text-sm ${
                      mood === option.score
                        ? "border-primary bg-secondary font-semibold"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <span className="block text-2xl">{"○●"[mood === option.score ? 1 : 0]}</span>
                    <span className="mt-2 block">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={step === 0}
              onClick={() => setStep((value) => Math.max(0, value - 1))}
            >
              <ArrowLeft className="size-4" aria-hidden />
              {t("common.back")}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                className="rounded-full px-6"
                disabled={!canContinue}
                onClick={() => setStep((value) => value + 1)}
              >
                {t("common.continue")}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button
                className="rounded-full px-6"
                disabled={!canContinue || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? t("common.saving") : t("onboarding.finishSetup")}
              </Button>
            )}
          </div>
        </div>
      </main>
      <SafetyFooter />
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm ${
        active
          ? "border-primary bg-secondary font-semibold text-secondary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}
