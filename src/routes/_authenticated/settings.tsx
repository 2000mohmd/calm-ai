import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { deleteMyData, getMyProfile, updateMyLanguage } from "@/lib/onboarding.functions";
import { AppShell } from "@/components/AppShell";
import { YourDataSection } from "@/components/YourDataSection";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation, type Language } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Your profile & data — Kalm" },
      {
        name: "description",
        content:
          "Review what Kalm knows about you, your account mode, and delete your data anytime.",
      },
      { property: "og:title", content: "Your profile & data — Kalm" },
      {
        property: "og:description",
        content: "Review what Kalm knows about you and delete your data anytime.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const wipeData = useServerFn(deleteMyData);
  const saveLanguage = useServerFn(updateMyLanguage);

  const MODE_LABELS: Record<string, string> = {
    general: t("settings.modes.general"),
    condition: t("settings.modes.condition"),
    teen: t("settings.modes.teen"),
    org_member: t("settings.modes.orgMember"),
  };

  const { data, isPending } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });

  const mutation = useMutation({
    mutationFn: () => wipeData(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success(t("settings.deleteData.successToast"));
    },
    onError: () => toast.error(t("settings.deleteData.errorToast")),
  });

  const languageMutation = useMutation({
    mutationFn: (language: Language) => saveLanguage({ data: { language } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success(t("language.saved"));
    },
    onError: () => toast.error(t("language.saveFailed")),
  });

  const profile = data?.profile;
  const intro = data?.intro;

  return (
    <AppShell>
      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <header>
            <h1 className="text-3xl sm:text-4xl">{t("settings.title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("settings.subtitle")}</p>
          </header>

          <section className="surface-soft p-6">
            <h2 className="text-lg">{t("language.sectionTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("language.sectionDescription")}</p>
            <div className="mt-4">
              <LanguageSwitcher onChange={(language) => languageMutation.mutate(language)} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("language.companionNote")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("language.reviewNotice")}</p>
          </section>

          <section className="surface-soft p-6">
            <h2 className="text-lg">{t("settings.account.title")}</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Row
                label={t("settings.account.preferredName")}
                value={profile?.preferred_name ?? "—"}
              />
              <Row
                label={t("settings.account.mode")}
                value={MODE_LABELS[profile?.account_type ?? ""] ?? profile?.account_type ?? "—"}
              />
              <Row
                label={t("settings.account.aiPersonalization")}
                value={
                  profile?.ai_context_consent ? t("settings.account.on") : t("settings.account.off")
                }
              />
              <Row
                label={t("settings.account.consentAccepted")}
                value={
                  profile?.consent_accepted_at
                    ? new Date(profile.consent_accepted_at).toLocaleDateString()
                    : "—"
                }
              />
            </dl>
          </section>

          <section className="surface-soft p-6">
            <h2 className="text-lg">{t("settings.intro.title")}</h2>
            <p className="mt-3 whitespace-pre-wrap text-muted-foreground">
              {intro?.intro_text || t("settings.intro.empty")}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Row
                label={t("settings.intro.goals")}
                value={(intro?.goals ?? []).join(", ") || "—"}
              />
              <Row
                label={t("settings.intro.stressors")}
                value={(intro?.stressors ?? []).join(", ") || "—"}
              />
              <Row
                label={t("settings.intro.communicationPreference")}
                value={intro?.communication_preference || "—"}
              />
              <Row
                label={t("settings.intro.topicsToAvoid")}
                value={intro?.topics_to_avoid || "—"}
              />
              <Row
                label={t("settings.intro.workingWithProfessional")}
                value={
                  intro?.in_professional_care
                    ? t("settings.intro.yes")
                    : t("settings.intro.notCurrently")
                }
              />
              <Row
                label={t("settings.intro.sharedDiagnosis")}
                value={intro?.existing_diagnosis || "—"}
              />
            </div>
          </section>

          <section className="surface-soft p-6">
            <h2 className="text-lg">{t("settings.support.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("settings.support.body")}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="rounded-full">
                <Link to="/support">{t("settings.support.messageButton")}</Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-full">
                <Link to="/care">{t("settings.support.resourcesButton")}</Link>
              </Button>
            </div>
          </section>

          <YourDataSection />

          <section className="surface-soft p-6">
            <h2 className="text-lg">{t("settings.deleteData.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("settings.deleteData.body")}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-5 rounded-full">
                  {t("settings.deleteData.button")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.deleteData.dialogTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.deleteData.dialogBody")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("settings.deleteData.keep")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending
                      ? t("settings.deleteData.deleting")
                      : t("settings.deleteData.confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>

          <p className="text-sm text-muted-foreground">
            {t("settings.readLegalPrefix")}{" "}
            <Link to="/legal" className="font-semibold text-primary underline underline-offset-4">
              {t("settings.legalLinkText")}
            </Link>
            .
          </p>
        </div>
      )}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
