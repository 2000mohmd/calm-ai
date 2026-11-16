// REST handlers for /api/v1/billing/*. Gateway-neutral; see src/lib/billing.
// Both answer 501 {error:"Payments not enabled"} until PAYMENT_PROVIDER is set.
import { z } from "zod";
import {
  BillingUnavailableError,
  openPortalCore,
  startCheckoutCore,
} from "@/lib/billing/checkout.server";
import { billingEnabled } from "@/lib/billing/provider";
import { ApiError, handle, json, readJson, requireAuth } from "./-shared";

const CheckoutBody = z.object({
  tier: z.enum(["pro", "premium"]),
  interval: z.enum(["monthly", "yearly"]),
  return_url: z.string().max(2048).optional(),
  cancel_url: z.string().max(2048).optional(),
});

const PortalBody = z.object({ return_url: z.string().max(2048).optional() });

function disabled(): Response {
  return json({ error: "Payments not enabled" }, 501);
}

/** Maps a provider's "not available" to 501; everything else to handle(). */
async function guarded(fn: () => Promise<Response>): Promise<Response> {
  return handle(async () => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof BillingUnavailableError) return json({ error: err.message }, 501);
      throw err;
    }
  });
}

/** POST /api/v1/billing/checkout  { tier, interval, return_url?, cancel_url? } -> { url } */
export async function handleBillingCheckout(request: Request): Promise<Response> {
  if (!billingEnabled()) return disabled();
  return guarded(async () => {
    const { supabase, userId, email } = await requireAuth(request);
    const body = await readJson(request, CheckoutBody);
    const result = await startCheckoutCore(supabase, userId, {
      email,
      tier: body.tier,
      interval: body.interval,
      returnUrl: body.return_url,
      cancelUrl: body.cancel_url,
    });
    return json({ url: result.url });
  });
}

/** POST /api/v1/billing/portal  { return_url? } -> { url } */
export async function handleBillingPortal(request: Request): Promise<Response> {
  if (!billingEnabled()) return disabled();
  return guarded(async () => {
    const { userId } = await requireAuth(request);
    // An empty body is fine here.
    const raw = await request.text();
    let body: z.infer<typeof PortalBody> = {};
    if (raw.trim()) {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw);
      } catch {
        throw new ApiError(400, "Invalid JSON body");
      }
      const parsed = PortalBody.safeParse(parsedJson);
      if (!parsed.success) throw new ApiError(400, "Validation failed");
      body = parsed.data;
    }
    const result = await openPortalCore(userId, { returnUrl: body.return_url });
    return json({ url: result.url });
  });
}
