// Handlers behind /api/public/unsubscribe. Opening the emailed link (GET) only
// SHOWS a confirmation page: mail scanners and link previewers fetch URLs on
// their own, so a GET must never change anything. The opt-out is applied by a
// POST, either from the button on that page or the RFC 8058 one-click request
// mail clients send (credentials in the query string of the POST URL).
import { verifyUnsubscribeToken } from "./email.server";

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/;

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title} — Calm AI</title>
<style>
  body { font-family:system-ui,-apple-system,sans-serif; max-width:34rem; margin:4rem auto; padding:0 1.5rem;
         line-height:1.65; color:#1f2421; }
  h1 { font-size:1.35rem; margin-bottom:.5rem; }
  p { color:#4a524d; }
  button { font:inherit; font-weight:600; border:0; border-radius:14px; padding:12px 20px; background:#1f2421;
           color:#fff; cursor:pointer; }
</style>
</head><body><h1>${title}</h1>${body}</body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Holds credentials in a form: never cache, never frame.
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function invalidPage(): Response {
  return page(
    "This link isn't valid",
    "<p>The unsubscribe link is invalid or has expired. You can turn off check-in emails any time in the Calm AI app, under Settings.</p>",
    400,
  );
}

/** Well-formed (so safe to embed in HTML) and correctly signed, else null. */
async function parseCredentials(
  userId: unknown,
  token: unknown,
): Promise<{ userId: string; token: string } | null> {
  if (typeof userId !== "string" || !USER_ID.test(userId)) return null;
  if (typeof token !== "string" || !TOKEN.test(token)) return null;
  return (await verifyUnsubscribeToken(userId, token)) ? { userId, token } : null;
}

/** GET: explain and ask for an explicit click. Changes nothing. */
export async function unsubscribeConfirm(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const creds = await parseCredentials(url.searchParams.get("u"), url.searchParams.get("t"));
  if (!creds) return invalidPage();
  return page(
    "Unsubscribe from check-in emails?",
    `<p>You'll stop getting check-in and weekly-reflection emails from Calm AI. Crisis-safety and account emails aren't affected.</p>
<form method="post" action="/api/public/unsubscribe">
<input type="hidden" name="u" value="${creds.userId}" />
<input type="hidden" name="t" value="${creds.token}" />
<button type="submit">Yes, unsubscribe me</button>
</form>`,
  );
}

/** POST: apply the opt-out. Credentials come from the form body, else the URL (one-click). */
export async function unsubscribeApply(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let userId: unknown = url.searchParams.get("u");
  let token: unknown = url.searchParams.get("t");
  if (!userId || !token) {
    try {
      const form = await request.formData();
      userId = form.get("u");
      token = form.get("t");
    } catch {
      // no usable body: fall through to the invalid page
    }
  }

  const creds = await parseCredentials(userId, token);
  if (!creds) return invalidPage();

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (
      supabaseAdmin.from("profiles") as unknown as {
        update: (v: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{ error: unknown }>;
        };
      }
    )
      .update({ email_opt_out: true })
      .eq("id", creds.userId);
    if (error) {
      console.error("[unsubscribe] update failed", error);
      return page(
        "Something went wrong",
        "<p>We couldn't update your settings just now. Please try the link again, or turn off emails in the Calm AI app under Settings.</p>",
        500,
      );
    }
  } catch (err) {
    console.error("[unsubscribe] threw", err);
    return page(
      "Something went wrong",
      "<p>We couldn't update your settings just now. Please try again, or turn off emails in the Calm AI app under Settings.</p>",
      500,
    );
  }

  return page(
    "You're unsubscribed",
    "<p>You won't get check-in or weekly-reflection emails from Calm AI anymore. " +
      "You can turn them back on any time in the app, under Settings. " +
      "Crisis-safety and account emails aren't affected by this.</p>",
  );
}
