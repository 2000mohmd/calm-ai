// Single source of truth for the per-user daily message cap and the weekly
// voice-call allowance.
//
// The enforcer (rate-limit/postgres.ts) and the reporter
// (entitlements.server.ts / GET /api/v1/entitlements) BOTH derive the number
// from `dailyMessageCap(tier)` here — so the limit we advertise is exactly the
// limit we enforce.
//
// Tiers: free | pro | premium | org
//   free    — onboarding + plan preview + ONE first conversation (a lifetime
//             allowance of FREE_INTRO_MESSAGE_CAP messages), then a plan is
//             needed. No daily free messages. Crisis messages are never capped.
//   pro     — 200 messages/day, 1 voice call per rolling 7 days
//   premium — 500 messages/day (marketed as "unlimited" — it's an abuse guard,
//             not a literal infinity), 2 voice calls per rolling 7 days
//   org     — same allowances as premium
//
// Tiers are granted by an admin (profiles.subscription_tier); there is no
// payment mechanism in the app.

export type ChatTier = "free" | "pro" | "premium" | "org";

function envInt(key: string, fallback: number): number {
  const raw = Number(process.env[key]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

/** Free tier: messages in their first conversation, lifetime. Tune with FREE_INTRO_MESSAGE_CAP. */
export const FREE_INTRO_MESSAGE_CAP = envInt("FREE_INTRO_MESSAGE_CAP", 15);

/** The human coach: paid tiers only. Org members are covered by their org. */
export function humanCoachAllowed(tier: string | null | undefined): boolean {
  return isUnlimitedishTier(tier);
}

/** Pro: the original high cap. Tune with CHAT_DAILY_MESSAGE_CAP. */
export const HIGH_DAILY_MESSAGE_CAP = envInt("CHAT_DAILY_MESSAGE_CAP", 200);

/** Premium / org: the "unlimited" ceiling. Tune with PREMIUM_DAILY_MESSAGE_CAP. */
export const PREMIUM_DAILY_MESSAGE_CAP = envInt("PREMIUM_DAILY_MESSAGE_CAP", 500);

/** pro/premium/org are paid tiers (treated as effectively uncapped for UX copy). */
export function isUnlimitedishTier(tier: string | null | undefined): boolean {
  return tier === "pro" || tier === "premium" || tier === "org";
}

/** The daily message cap that actually applies to this user's tier. */
export function dailyMessageCap(tier: string | null | undefined): number {
  if (tier === "premium" || tier === "org") return PREMIUM_DAILY_MESSAGE_CAP;
  if (tier === "pro") return HIGH_DAILY_MESSAGE_CAP;
  // Free has no daily allowance of its own: the lifetime intro cap is the real
  // limit (enforced in chat.functions.ts), so the daily cap must never bite first.
  return FREE_INTRO_MESSAGE_CAP;
}

// --- Voice calls ------------------------------------------------------------

/** Rolling window the call allowance is counted over. */
export const CALL_WINDOW_DAYS = 7;
export const CALL_WINDOW_MS = CALL_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Live voice calls allowed per rolling 7 days for this tier (0 = no access). */
export function weeklyCallAllowance(tier: string | null | undefined): number {
  if (tier === "premium" || tier === "org") return 2;
  if (tier === "pro") return 1;
  return 0;
}

/** ISO timestamp of the next UTC midnight — when the daily cap resets. */
export function dailyCapResetsAt(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0),
  ).toISOString();
}

// --- Call length + voice-note caps (server-enforced) -------------------------

/** Hard server cap on one live call. The reaper and stored durations use it. */
export const MAX_CALL_SECONDS = 15 * 60;
/** An 'active' call older than this is dead (client vanished); the reaper ends it. Keep in sync with the SQL. */
export const STALE_CALL_SECONDS = 20 * 60;

/** Stored/displayed call duration never exceeds the server max. */
export function capCallSeconds(seconds: number): number {
  return Math.min(MAX_CALL_SECONDS, Math.max(0, Math.round(seconds)));
}

/** True when an active call that began at `startedAt` should be reaped. */
export function isCallStale(startedAt: string | Date, now: Date = new Date()): boolean {
  return now.getTime() - new Date(startedAt).getTime() > STALE_CALL_SECONDS * 1000;
}

/** Free members get a handful of voice notes a day; paid tiers keep the old ceiling. Tune with FREE_DAILY_VOICE_NOTE_CAP. */
export const FREE_DAILY_VOICE_NOTE_CAP = envInt("FREE_DAILY_VOICE_NOTE_CAP", 5);
export const PAID_DAILY_VOICE_NOTE_CAP = 300;

export function dailyVoiceNoteCap(tier: string | null | undefined): number {
  return isUnlimitedishTier(tier) ? PAID_DAILY_VOICE_NOTE_CAP : FREE_DAILY_VOICE_NOTE_CAP;
}
