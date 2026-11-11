import { appBaseUrl } from "./app-url";

/** Deep-link schemes of our own mobile app that checkout may return to. */
const APP_SCHEMES = ["kalm:"];

/**
 * Where Stripe may send someone back to: this app's own origin, or the mobile
 * app's deep-link scheme. Anything else (another site, javascript:, data:) gets
 * the fallback, so a crafted request can't turn checkout into an open redirect
 * or aim the emailed parent link somewhere hostile.
 */
export function safeReturnUrl(candidate: string | null | undefined, fallback: string): string {
  if (!candidate) return fallback;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return fallback;
  }
  if (APP_SCHEMES.includes(url.protocol)) return candidate;
  if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
  return url.origin === new URL(appBaseUrl()).origin ? candidate : fallback;
}
