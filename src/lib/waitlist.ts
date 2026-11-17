export const WAITLIST_SOURCES = ["plans", "final", "footer"] as const;
export type WaitlistSource = (typeof WAITLIST_SOURCES)[number];

const MAX_EMAIL_LENGTH = 254;
// Conservative: one @, no whitespace, dotted domain with no empty labels.
// Control characters are rejected separately (hasControlChar).
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

/** Trim + lowercase. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Pure check on an already-normalized address. */
export function isValidEmail(email: string): boolean {
  return email.length <= MAX_EMAIL_LENGTH && !hasControlChar(email) && EMAIL_RE.test(email);
}

export function parseSource(raw: unknown): WaitlistSource {
  return WAITLIST_SOURCES.find((s) => s === raw) ?? "final";
}
