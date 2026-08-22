import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SafetyFooter } from "@/components/SafetyFooter";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Disclaimers, privacy & terms — Kalm" },
      {
        name: "description",
        content:
          "How Kalm handles sensitive wellness data, what the AI companion is and isn't, and your data rights.",
      },
      { property: "og:title", content: "Disclaimers, privacy & terms — Kalm" },
      {
        property: "og:description",
        content: "What Kalm is, what it isn't, and how your wellness data is handled.",
      },
    ],
  }),
  component: LegalPage,
});

const SECTION_KEYS = [
  "notMedicalCare",
  "howAiWorks",
  "yourData",
  "ageRequirement",
  "workplaceAccounts",
] as const;

function LegalPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("common.back")}
        </Link>
        <h1 className="text-4xl">{t("legal.pageTitle")}</h1>
        <div className="mt-10 space-y-8">
          {SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="text-xl">{t(`legal.sections.${key}.heading`)}</h2>
              <p className="mt-2 text-muted-foreground">{t(`legal.sections.${key}.body`)}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 text-sm text-muted-foreground">
          {t("legal.questionsNote")}{" "}
          <Link to="/crisis" className="font-semibold text-primary underline underline-offset-4">
            {t("landing.crisisResources")}
          </Link>
        </p>
      </main>
      <SafetyFooter />
    </div>
  );
}
