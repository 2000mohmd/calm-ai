import { createFileRoute } from "@tanstack/react-router";

/**
 * Gateway-neutral payment webhook: /api/public/hooks/payments.
 *
 * The configured PaymentProvider verifies the gateway's signature and turns the
 * request into PlanEvents; each is applied idempotently (applyPlanEvent). Point
 * the gateway's webhook at this URL. 404 until PAYMENT_PROVIDER is set.
 *
 * Status codes: 400 = unreadable/unverifiable (never says why); 500 = we failed
 * to apply an event (the gateway should retry; applied events are idempotent).
 */
const reply = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function receive(request: Request): Promise<Response> {
  const { getPaymentProvider } = await import("@/lib/billing/provider");
  const provider = getPaymentProvider();
  if (!provider) return reply({ error: "Payments not enabled" }, 404);

  let events;
  try {
    events = await provider.parseWebhook(request);
  } catch (error) {
    console.warn("[payments] webhook rejected", error instanceof Error ? error.message : error);
    return reply({ error: "Invalid webhook" }, 400);
  }

  const [{ supabaseAdmin }, { applyPlanEvent }] = await Promise.all([
    import("@/integrations/supabase/client.server"),
    import("@/lib/billing/plan-grants.server"),
  ]);
  try {
    for (const event of events) await applyPlanEvent(supabaseAdmin, event);
  } catch (error) {
    console.error("[payments] applying plan event failed", error);
    return reply({ error: "Webhook processing failed" }, 500);
  }
  return reply({ received: true }, 200);
}

export const Route = createFileRoute("/api/public/hooks/payments")({
  server: {
    handlers: {
      POST: ({ request }) => receive(request),
      GET: ({ request }) => receive(request),
    },
  },
});
