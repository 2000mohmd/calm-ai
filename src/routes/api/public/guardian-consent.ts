// The link a guardian opens from their email. Public by necessity: the guardian
// has no account, so the only credential is the one-time token. Opening the link
// (GET) only shows a confirmation page; the decision is applied by the POST from
// its button, so mail scanners and link previews can't approve or withdraw
// consent by merely fetching the URL.
import { createFileRoute } from "@tanstack/react-router";
import {
  confirmPage,
  invalidPage,
  parseConsentRequest,
  resultPage,
} from "@/lib/guardian-consent-pages.server";

export const Route = createFileRoute("/api/public/guardian-consent")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = parseConsentRequest(
          url.searchParams.get("token"),
          url.searchParams.get("action"),
        );
        return parsed ? confirmPage(parsed.token, parsed.action) : invalidPage();
      },

      POST: async ({ request }) => {
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return invalidPage();
        }
        const parsed = parseConsentRequest(form.get("token"), form.get("action"));
        if (!parsed) return invalidPage();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { applyGuardianDecision } = await import("@/lib/guardian-consent.server");

        const result = await applyGuardianDecision(supabaseAdmin, {
          token: parsed.token,
          action: parsed.action,
          ip:
            request.headers.get("cf-connecting-ip") ??
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            null,
          userAgent: request.headers.get("user-agent"),
        });
        return resultPage(result);
      },
    },
  },
});
