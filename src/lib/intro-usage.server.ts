// How much of a free member's first conversation is spent.
//
// Counting only the chat_messages that still exist would let someone reset the
// allowance by deleting their conversation, so it is also compared with
// chat_usage.lifetime_messages, the running count of replies the companion has
// given, which survives deletes. The larger of the two wins.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type IntroUsage = {
  /** User messages currently stored. */
  stored: number;
  /** Companion replies ever given (never decreases when messages are deleted). */
  answered: number;
};

export async function introUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<IntroUsage> {
  const [stored, usage] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("sender", "user"),
    supabase.from("chat_usage").select("lifetime_messages").eq("user_id", userId).maybeSingle(),
  ]);
  return { stored: stored.count ?? 0, answered: usage.data?.lifetime_messages ?? 0 };
}

/** Messages spent so far, for display. */
export function introSpent({ stored, answered }: IntroUsage): number {
  return Math.max(stored, answered);
}

/**
 * Messages spent including the one being processed right now. The new message is
 * already stored (so `stored` includes it) but not yet counted as answered.
 */
export function introSpentWithCurrent({ stored, answered }: IntroUsage): number {
  return Math.max(stored, answered + 1);
}
