import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyStripeEvent } from "@/lib/billing/stripe-events.server";
import { verifyStripeWebhook } from "@/lib/billing/stripe.server";

// stripe_webhook_events and some profiles billing columns aren't in the
// generated Database types yet; widening to the untyped SupabaseClient keeps
// this typechecking until the types are regenerated (`supabase gen types`).
function loose(client: unknown): SupabaseClient {
  return client as SupabaseClient;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/**
 * POST /api/public/hooks/stripe-webhook. Register this URL in the Stripe
 * dashboard (Developers -> Webhooks), test mode first. Stripe signs every
 * delivery with STRIPE_WEBHOOK_SECRET (a different secret for the test-mode
 * endpoint than the live one: just an env var, no code change).
 *
 * Subscribe it to: checkout.session.completed, customer.subscription.created,
 * customer.subscription.updated, customer.subscription.deleted.
 * What each event does is in lib/billing/stripe-events.server.ts.
 */
export const Route = createFileRoute("/api/public/hooks/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        let event: { id: string; type: string; data: { object: Record<string, unknown> } };
        try {
          event = await verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"));
        } catch (error) {
          console.error("stripe webhook signature check failed", error);
          return json({ error: "Invalid signature" }, 400);
        }

        const { supabaseAdmin: typedAdmin } = await import("@/integrations/supabase/client.server");
        const supabaseAdmin = loose(typedAdmin);

        // Idempotency: Stripe retries any delivery that doesn't 2xx, and the
        // same event can be delivered twice at once. Claim the event id FIRST
        // (the insert is the atomic step); a duplicate key means someone else
        // has it. If handling then fails, release the claim so Stripe's retry
        // can run it again.
        const claim = await supabaseAdmin
          .from("stripe_webhook_events")
          .insert({ id: event.id, type: event.type });
        if (claim.error) {
          if (claim.error.code === "23505") return json({ ok: true, duplicate: true }, 200);
          console.error("stripe webhook: could not record event", event.id, claim.error);
          return json({ error: "Could not record event" }, 500);
        }

        try {
          await applyStripeEvent(supabaseAdmin, event);
        } catch (error) {
          console.error("stripe webhook handling failed", event.type, error);
          await supabaseAdmin.from("stripe_webhook_events").delete().eq("id", event.id);
          return json({ error: "Handler failed" }, 500);
        }

        return json({ ok: true }, 200);
      },
    },
  },
});
