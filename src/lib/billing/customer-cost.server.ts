// Internal cost visibility: what one customer actually costs us. Admin-only — never exposed on any member-facing route.
//
// Chat cost comes from chat_usage (token counters written by the rate limiter)
// priced with rate-limit/pricing.ts. Voice cost comes from
// call_sessions.estimated_cost_usd, written when a call ends.
import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateCostUsd, estimateCallCostUsd } from "../rate-limit/pricing";
import { dailyMessageCap, weeklyCallAllowance } from "../chat-limits";

type Loose = SupabaseClient;

export type CustomerCostReport = {
  userId: string;
  tier: string;
  allowances: { dailyMessages: number; weeklyCalls: number };
  period: { start: string; end: string };
  chat: {
    messages: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  };
  voice: { calls: number; minutes: number; estimatedCostUsd: number };
  totalEstimatedCostUsd: number;
};

/** Cost report for the last 30 days. */
export async function getCustomerCostReport(
  supabase: Loose,
  userId: string,
): Promise<CustomerCostReport> {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [profileRes, usageRes, callsRes] = await Promise.all([
    supabase.from("profiles").select("subscription_tier").eq("id", userId).maybeSingle(),
    supabase
      .from("chat_usage")
      .select("lifetime_messages, lifetime_input_tokens, lifetime_output_tokens")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("call_sessions")
      .select("duration_seconds, estimated_cost_usd, input_tokens, output_tokens")
      .eq("user_id", userId)
      .gte("started_at", start.toISOString()),
  ]);

  const profile = (profileRes.data ?? {}) as Record<string, unknown>;
  const tier = (profile["subscription_tier"] as string) ?? "free";

  const usage = (usageRes.data ?? {}) as Record<string, number>;
  const inputTokens = Number(usage["lifetime_input_tokens"] ?? 0);
  const outputTokens = Number(usage["lifetime_output_tokens"] ?? 0);
  const chatCost = estimateCostUsd("claude-sonnet-5", inputTokens, outputTokens);

  const calls = (callsRes.data ?? []) as {
    duration_seconds: number | null;
    estimated_cost_usd: number | null;
    input_tokens: number | null;
    output_tokens: number | null;
  }[];
  let voiceSeconds = 0;
  let voiceCost = 0;
  for (const call of calls) {
    const seconds = call.duration_seconds ?? 0;
    voiceSeconds += seconds;
    voiceCost +=
      Number(call.estimated_cost_usd ?? 0) ||
      estimateCallCostUsd(seconds, call.input_tokens ?? 0, call.output_tokens ?? 0);
  }

  const total = chatCost + voiceCost;

  return {
    userId,
    tier,
    allowances: { dailyMessages: dailyMessageCap(tier), weeklyCalls: weeklyCallAllowance(tier) },
    period: { start: start.toISOString(), end: end.toISOString() },
    chat: {
      messages: Number(usage["lifetime_messages"] ?? 0),
      inputTokens,
      outputTokens,
      estimatedCostUsd: Number(chatCost.toFixed(4)),
    },
    voice: {
      calls: calls.length,
      minutes: Math.round(voiceSeconds / 60),
      estimatedCostUsd: Number(voiceCost.toFixed(4)),
    },
    totalEstimatedCostUsd: Number(total.toFixed(4)),
  };
}
