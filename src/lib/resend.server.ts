// Single Resend sender. Never throws; returns a typed result. Logs never include
// full addresses (domain only) and error bodies are truncated.

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;
const MAX_LOG_BODY = 300;

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  from: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  /** Log prefix, e.g. "[support]". */
  tag?: string;
};

export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: "no_api_key" | "http_error" | "network_error"; status?: number };

export function emailDomain(address: string): string {
  const at = address.lastIndexOf("@");
  return at >= 0 ? address.slice(at + 1) : "unknown";
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const tag = input.tag ?? "[email]";
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.error(`${tag} send skipped: RESEND_API_KEY missing`);
    return { ok: false, reason: "no_api_key" };
  }

  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const domains = recipients.map(emailDomain).join(",");

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: input.from,
        to: recipients,
        subject: input.subject,
        ...(input.html !== undefined ? { html: input.html } : {}),
        ...(input.text !== undefined ? { text: input.text } : {}),
        ...(input.headers ? { headers: input.headers } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const body = (await response.text().catch(() => "")).slice(0, MAX_LOG_BODY);
      console.error(`${tag} send failed [${response.status}] to @${domains}: ${body}`);
      return { ok: false, reason: "http_error", status: response.status };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`${tag} send threw to @${domains}: ${message.slice(0, MAX_LOG_BODY)}`);
    return { ok: false, reason: "network_error" };
  }
}
