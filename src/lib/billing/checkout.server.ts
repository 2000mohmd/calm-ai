// Checkout / portal, shared by the web server functions (billing.functions.ts)
// and the mobile REST routes (/api/v1/billing/*). Gateway-neutral: everything
// gateway-specific happens inside the PaymentProvider.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { appBaseUrl } from "../app-url";
import { enforceBurst } from "../burst-limit";
import { UserInputError } from "../user-input-error";
import { getPaymentProvider } from "./provider";
import type { BillingInterval, PaidTier } from "./plans";

/** Thrown when payments are off (no provider) or the provider lacks a feature. */
export class BillingUnavailableError extends Error {
  constructor(message = "Payments not enabled") {
    super(message);
    this.name = "BillingUnavailableError";
  }
}

/** Deep-link schemes of our own mobile app that checkout may return to. */
const APP_SCHEMES = ["kalm:"];

/**
 * Where the gateway may send someone back to: this app's own origin or the
 * mobile deep-link scheme. Anything else gets the fallback, so a crafted
 * request can't turn checkout into an open redirect.
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

export async function startCheckoutCore(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: {
    email?: string | null | undefined;
    tier: PaidTier;
    interval: BillingInterval;
    returnUrl?: string | null | undefined;
    cancelUrl?: string | null | undefined;
  },
): Promise<{ url: string }> {
  const provider = getPaymentProvider();
  if (!provider) throw new BillingUnavailableError();
  enforceBurst(`checkout:${userId}`, 10, 600_000);

  const profile = await supabase
    .from("profiles")
    .select("account_type, subscription_tier")
    .eq("id", userId)
    .maybeSingle();
  // Minors can't pay; the guardian flow isn't built for this gateway-neutral layer.
  if (profile.data?.account_type === "teen") {
    throw new UserInputError(
      "Plans for under-18 accounts are arranged with a guardian. Contact support.",
    );
  }
  if (profile.data?.subscription_tier === "org") {
    throw new UserInputError("Your plan is provided by your organisation.");
  }

  const base = appBaseUrl();
  return provider.createCheckout({
    userId,
    email: input.email ?? null,
    tier: input.tier,
    interval: input.interval,
    returnUrl: safeReturnUrl(input.returnUrl, `${base}/plans?checkout=success`),
    cancelUrl: safeReturnUrl(input.cancelUrl, `${base}/plans?checkout=cancelled`),
  });
}

export async function openPortalCore(
  userId: string,
  input: { returnUrl?: string | null | undefined },
): Promise<{ url: string }> {
  const provider = getPaymentProvider();
  if (!provider) throw new BillingUnavailableError();
  if (!provider.createPortal) throw new BillingUnavailableError("Billing portal not available");
  enforceBurst(`portal:${userId}`, 10, 600_000);
  return provider.createPortal({
    userId,
    returnUrl: safeReturnUrl(input.returnUrl, `${appBaseUrl()}/plans`),
  });
}
