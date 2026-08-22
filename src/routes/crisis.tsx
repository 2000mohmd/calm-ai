import { createFileRoute, Link } from "@tanstack/react-router";
import { PhoneCall, MessageSquare, Globe, ArrowLeft } from "lucide-react";
import { SafetyFooter } from "@/components/SafetyFooter";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/crisis")({
  head: () => ({
    meta: [
      { title: "Crisis resources — Kalm" },
      {
        name: "description",
        content:
          "Immediate crisis support lines and text services. Always free and never gated in Kalm.",
      },
      { property: "og:title", content: "Crisis resources — Kalm" },
      {
        property: "og:description",
        content: "Immediate crisis support lines and text services, always available in Kalm.",
      },
    ],
  }),
  component: CrisisPage,
});

const RESOURCE_DEFS = [
  { icon: PhoneCall, key: "lifeline", href: "tel:988" },
  { icon: MessageSquare, key: "textLine", href: "sms:741741?&body=HOME" },
  { icon: Globe, key: "findAHelpline", href: "https://findahelpline.com" },
] as const;

function CrisisPage() {
  const { t } = useTranslation();
  const RESOURCES = RESOURCE_DEFS.map((resource) => ({
    icon: resource.icon,
    href: resource.href,
    title: t(`crisisPage.resources.${resource.key}.title`),
    detail: t(`crisisPage.resources.${resource.key}.detail`),
    action: t(`crisisPage.resources.${resource.key}.action`),
  }));

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

        <h1 className="text-4xl">{t("crisisPage.title")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("crisisPage.body")}</p>

        <div className="mt-10 space-y-4">
          {RESOURCES.map(({ icon: Icon, title, detail, href, action }) => (
            <a
              key={title}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="surface-soft flex items-start gap-4 p-6 hover:border-primary"
            >
              <Icon className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
              <span className="flex-1">
                <span className="block text-lg font-semibold">{title}</span>
                <span className="mt-1 block text-muted-foreground">{detail}</span>
                <span className="mt-3 block text-sm font-semibold text-primary underline underline-offset-4">
                  {action}
                </span>
              </span>
            </a>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-crisis/40 bg-crisis-surface p-6 text-crisis">
          <p className="font-semibold">{t("crisisPage.immediateDangerTitle")}</p>
          <p className="mt-1">{t("crisisPage.immediateDangerBody")}</p>
        </div>
      </main>
      <SafetyFooter />
    </div>
  );
}
