// Turns a gateway-neutral PlanEvent into a change to profiles.subscription_tier.
//
// MUST be called with the service-role client (supabaseAdmin): a database
// trigger rejects tier / period-end edits from any other role. The legacy
// profiles.stripe_* columns are never written here.
//
// Idempotency: claim-first. We insert the event id into `stripe_webhook_events`
// before doing anything; a unique-violation means we already handled (or are
// handling) it. The table name is historical: it is now a generic
// (id, type, created_at) "processed gateway events" table for ANY gateway.
// If applying the change fails, the claim is released so the gateway's retry
// can succeed.
//
// Rules:
//   activated / renewed -> tier = event.tier, period end = event.periodEnd (if sent)
//   canceled            -> tier = 'free', period end cleared. Only when the member is
//                          currently on event.tier, so a late cancel of an old plan
//                          never downgrades a newer plan or an admin grant.
//                          (Simple on purpose: the gateway should send "canceled"
//                          when access should END, i.e. at period end.)
//   payment_failed      -> tier unchanged; logged only. The gateway's own retry/dunning
//                          ends in "canceled" if the member never pays.
//   'org' members       -> never touched by payment events (their org covers them).
//
// Audit: admin_audit_log.admin_user_id is nullable (delete_account migration), so
// provider-driven changes get a row with admin_user_id = null (system actor).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PlanEvent } from "./provider";

type Client = SupabaseClient<Database>;

export type PlanEventResult = "applied" | "duplicate" | "ignored";

export async function applyPlanEvent(admin: Client, event: PlanEvent): Promise<PlanEventResult> {
  const claim = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.eventId, type: event.type });
  if (claim.error) {
    if (claim.error.code === "23505") return "duplicate";
    throw new Error(`plan event claim failed: ${claim.error.message}`);
  }

  try {
    return await apply(admin, event);
  } catch (error) {
    // Release the claim so a retry of the same event isn't swallowed as a duplicate.
    await admin.from("stripe_webhook_events").delete().eq("id", event.eventId);
    throw error;
  }
}

async function apply(admin: Client, event: PlanEvent): Promise<PlanEventResult> {
  const profile = await admin
    .from("profiles")
    .select("subscription_tier")
    .eq("id", event.userId)
    .maybeSingle();
  if (profile.error) throw new Error(`profile lookup failed: ${profile.error.message}`);
  if (!profile.data) {
    console.warn(`[billing] ${event.type} for unknown user ${event.userId}; ignored`);
    return "ignored";
  }
  const current = profile.data.subscription_tier;

  if (event.type === "payment_failed") {
    console.warn(`[billing] payment failed for user ${event.userId} (${event.tier}); tier kept`);
    return "ignored";
  }
  if (current === "org") return "ignored";

  let update: Database["public"]["Tables"]["profiles"]["Update"];
  if (event.type === "canceled") {
    if (current !== event.tier) return "ignored";
    update = { subscription_tier: "free", subscription_current_period_end: null };
  } else {
    update = { subscription_tier: event.tier };
    if (event.periodEnd) update.subscription_current_period_end = event.periodEnd;
  }

  const { error } = await admin.from("profiles").update(update).eq("id", event.userId);
  if (error) throw new Error(`tier update failed: ${error.message}`);

  console.info(
    `[billing] ${event.type}: user ${event.userId} ${current} -> ${update.subscription_tier}`,
  );
  const audit = await admin.from("admin_audit_log").insert({
    // Column is nullable in the DB; the generated types predate that migration.
    admin_user_id: null as never,
    action: `plan_${event.type}`,
    target_type: "user",
    target_id: event.userId,
    metadata: {
      from: current,
      to: update.subscription_tier,
      event_id: event.eventId,
      external_ref: event.externalRef ?? null,
    } as never,
  });
  if (audit.error) console.error("[billing] audit insert failed", audit.error.message);
  return "applied";
}
