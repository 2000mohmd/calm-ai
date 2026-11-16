import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { SafetyFooter } from "@/components/SafetyFooter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n";

export type LegalSection = { heading: string; body: ReactNode };

// Public document shell for /privacy and /terms (no sign-in needed so store
// listings can link here). Content is English-only on purpose: a policy
// translated without legal review is worse than none.
export function LegalDocument({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex justify-end px-6 pt-4">
        <LanguageSwitcher className="w-auto" />
      </div>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-14 pt-4">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("common.back")}
        </Link>
        <h1 className="text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>
        <p className="mt-6 text-muted-foreground">{intro}</p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl">{section.heading}</h2>
              <div className="mt-2 space-y-3 text-muted-foreground">{section.body}</div>
            </section>
          ))}
        </div>
        <p className="mt-12 text-sm text-muted-foreground">
          Contact: through Support in the app. If you are in crisis, see our{" "}
          <Link to="/crisis" className="font-semibold text-primary underline underline-offset-4">
            crisis resources
          </Link>
          .
        </p>
      </main>
      <SafetyFooter />
    </div>
  );
}
