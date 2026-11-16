import { TooManyRequestsError } from "./user-input-error";

// In-memory sliding window, per server instance. Only the FALLBACK now: the
// primary path is the shared Postgres counter (burst_hit, see migration
// 20260912000100_burst_counters.sql) used by enforceBurst/burstAllowed below.
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

let loggedRpcError = false;

type BurstRpc = {
  rpc: (
    fn: "burst_hit",
    args: { p_key: string; p_max: number; p_window_seconds: number },
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/**
 * Non-throwing check-and-record. Uses the shared Postgres counter (burst_hit RPC)
 * so limits hold across serverless instances; falls back to the in-memory limiter
 * when the service role key is missing (tests/dev) or the RPC fails.
 */
export async function burstAllowed(key: string, max: number, windowMs: number): Promise<boolean> {
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) return burstLimit(key, max, windowMs);
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as unknown as BurstRpc).rpc("burst_hit", {
      p_key: key,
      p_max: max,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    });
    if (error) throw new Error(error.message);
    if (typeof data !== "boolean") throw new Error("burst_hit returned a non-boolean");
    return data;
  } catch (err) {
    if (!loggedRpcError) {
      loggedRpcError = true;
      console.error("[burst-limit] shared counter unavailable, using in-memory fallback:", err);
    }
    return burstLimit(key, max, windowMs);
  }
}

/** Throws TooManyRequestsError (429 on the REST API) when over the limit. */
export async function enforceBurst(key: string, max: number, windowMs: number): Promise<void> {
  if (!(await burstAllowed(key, max, windowMs))) throw new TooManyRequestsError();
}

/** Test helper. */
export function resetBurstLimits(): void {
  buckets.clear();
}
