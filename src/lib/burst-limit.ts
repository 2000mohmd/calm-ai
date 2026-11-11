import { TooManyRequestsError } from "./user-input-error";

// ponytail: in-memory sliding window, per server instance (per isolate on
// Workers). It stops a runaway client or a tight loop on the costly endpoints
// (transcription, email-sending forms, checkout); it is not a defence against a
// distributed attack. The upgrade, if that matters, is a shared counter (a
// Postgres table or Redis) behind the same two functions.
const buckets = new Map<string, { times: number[]; windowMs: number }>();
const MAX_KEYS = 5000;

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    const last = bucket.times[bucket.times.length - 1] ?? 0;
    if (now - last >= bucket.windowMs) buckets.delete(key);
  }
}

/** True if this call is within `max` calls per `windowMs` for `key` (and records it). */
export function burstLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const bucket = buckets.get(key) ?? { times: [], windowMs };
  bucket.times = bucket.times.filter((time) => now - time < windowMs);
  bucket.windowMs = windowMs;
  if (bucket.times.length >= max) {
    buckets.set(key, bucket);
    return false;
  }
  bucket.times.push(now);
  buckets.set(key, bucket);
  if (buckets.size > MAX_KEYS) prune(now);
  return true;
}

/** Throws TooManyRequestsError (429 on the REST API) when over the limit. */
export function enforceBurst(key: string, max: number, windowMs: number): void {
  if (!burstLimit(key, max, windowMs)) throw new TooManyRequestsError();
}

/** Test helper. */
export function resetBurstLimits(): void {
  buckets.clear();
}
