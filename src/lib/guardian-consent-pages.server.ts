// The small HTML pages a parent sees from the consent email. They have no
// account, so the route renders these itself instead of adding an app page.
//
// Opening the emailed link only SHOWS a confirmation page. Mail scanners and link
// previewers fetch URLs on their own, so a GET must never change anything: the
// decision is applied only by the POST from the button on that page.
import { APPROVAL_VALID_DAYS, type ConsentActionResult } from "./guardian-consent.server";

export type ConsentAction = "approve" | "withdraw";

const TOKEN = /^[0-9a-f]{64}$/;

/** A well-formed token and action, or null. The token is hex-checked, so it is safe to embed in HTML. */
export function parseConsentRequest(
  token: unknown,
  action: unknown,
): { token: string; action: ConsentAction } | null {
  if (typeof token !== "string" || !TOKEN.test(token)) return null;
  if (action !== "approve" && action !== "withdraw") return null;
  return { token, action };
}

function page(title: string, body: string): Response {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title} — Calm AI</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#f4f2fb; color:#241f36; font-family:ui-sans-serif,system-ui,-apple-system,sans-serif; padding:24px; }
  main { max-width:34rem; background:#fff; border-radius:20px; padding:32px; box-shadow:0 10px 40px rgba(60,40,120,.08); }
  h1 { font-size:1.5rem; margin:0 0 12px; }
  p { line-height:1.65; margin:0 0 12px; color:#4b4463; }
  button { font:inherit; font-weight:600; border:0; border-radius:14px; padding:14px 22px; margin-top:8px;
           background:#241f36; color:#fff; cursor:pointer; }
</style>
</head><body><main><h1>${title}</h1>${body}</main></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // The page holds a one-time token and a button: never cache it, never frame it.
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export function invalidPage(): Response {
  return page(
    "This link isn't valid",
    "<p>Please open the most recent link from the email we sent you.</p>",
  );
}

/** Step one: explain, and ask for an explicit click. Changes nothing. */
export function confirmPage(token: string, action: ConsentAction): Response {
  const approve = action === "approve";
  const form = `<form method="post" action="/api/public/guardian-consent">
<input type="hidden" name="token" value="${token}" />
<input type="hidden" name="action" value="${action}" />
<button type="submit">${approve ? "Yes, give permission" : "Yes, withdraw permission"}</button>
</form>`;
  return approve
    ? page(
        "Give permission?",
        [
          "<p>Someone in your care has asked to use Calm AI, a wellness companion app with an AI companion, mood check-ins and guided exercises. It is not a therapist, a doctor or an emergency service.</p>",
          "<p>If it ever detects that someone may be in danger, it stops the conversation, shows real crisis helplines, and alerts our safety team.</p>",
          form,
        ].join(""),
      )
    : page(
        "Withdraw permission?",
        [
          "<p>This switches the AI companion off for that account. Crisis helplines stay available to them, always.</p>",
          form,
        ].join(""),
      );
}

/** Step two: what happened after the click. */
export function resultPage(result: ConsentActionResult): Response {
  if (!result.ok) {
    if (result.reason === "expired") {
      return page(
        "This link has expired",
        `<p>Permission links work for ${APPROVAL_VALID_DAYS} days. Please ask them to send a new request from the app.</p>`,
      );
    }
    return page(
      "This link isn't valid",
      "<p>It may have been replaced by a newer request. Please open the most recent email we sent you.</p>",
    );
  }

  if (result.action === "approve") {
    return page(
      "Thank you — permission given",
      [
        "<p>Their account is now active. They can use the companion, the exercises and the check-ins.</p>",
        "<p>Calm AI is a wellness companion, not a therapist or an emergency service. If it ever detects that someone may be in danger, it stops the conversation, shows real crisis helplines, and alerts our safety team.</p>",
        "<p>You can withdraw this permission at any time using the withdraw link in the same email.</p>",
      ].join(""),
    );
  }
  return page(
    "Permission withdrawn",
    [
      "<p>The companion has been switched off for that account. Crisis helplines stay available to them — those are never hidden.</p>",
      "<p>You can give permission again at any time using the approve link in the same email (while it is still valid), or by asking them to send a new request.</p>",
    ].join(""),
  );
}
