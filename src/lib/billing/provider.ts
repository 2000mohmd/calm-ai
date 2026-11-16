// Gateway-agnostic payments. The app never talks to a payment gateway directly:
// it talks to a PaymentProvider, and a gateway (Stripe, Paddle, Lemon Squeezy,
// Tap, Moyasar, ...) is one file that implements this interface.
//
// To add a gateway: create src/lib/billing/providers/<id>.server.ts exporting a
// PaymentProvider, add ONE registerPaymentProvider line below, set PAYMENT_PROVIDER=<id>.
// See docs/PAYMENTS.md. With PAYMENT_PROVIDER unset (or unknown) billing is off:
// no checkout, no webhook, and the plans page says "Payments launching soon".
import type { BillingInterval, PaidTier } from "./plans";

/** What the gateway told us happened to one member's subscription. */
export type PlanEvent = {
  /** Unique per gateway event; the idempotency key (retries must reuse it). */
  eventId: string;
  type: "activated" | "renewed" | "canceled" | "payment_failed";
  /** Our profiles.id, round-tripped through the gateway as metadata. */
  userId: string;
  tier: PaidTier;
  /** When the paid period ends (ISO-8601), if the gateway says. */
  periodEnd?: string;
  /** Gateway-side subscription/order id, for logs only. */
  externalRef?: string;
};

export type CheckoutInput = {
  userId: string;
  email: string | null;
  tier: PaidTier;
  interval: BillingInterval;
  /** Already validated against this app's origin / deep-link scheme. */
  returnUrl: string;
  cancelUrl: string;
};

export interface PaymentProvider {
  /** Matches the PAYMENT_PROVIDER env value. */
  id: string;
  createCheckout(input: CheckoutInput): Promise<{ url: string }>;
  /** Self-service "manage / cancel subscription" page. Optional. */
  createPortal?(input: { userId: string; returnUrl: string }): Promise<{ url: string }>;
  /**
   * Verify the gateway's signature and translate the request into plan events.
   * MUST throw on a bad signature or malformed payload (the route answers 400
   * and never echoes the message). Return [] for events we don't care about.
   */
  parseWebhook(request: Request): Promise<PlanEvent[]>;
}

// Factories (not instances) so a gateway only reads its env vars when it is
// actually selected.
const PROVIDERS = new Map<string, () => PaymentProvider>();

/** Register a gateway factory (used by the registrations below and by tests). */
export function registerPaymentProvider(id: string, factory: () => PaymentProvider): void {
  PROVIDERS.set(id, factory);
}

// --- Registered gateways: none yet. Add one line per gateway, e.g.
// registerPaymentProvider("stripe", () => stripeProvider);

/** Test helper. */
export function clearPaymentProviders(): void {
  PROVIDERS.clear();
}

/** The configured gateway, or null when PAYMENT_PROVIDER is unset or unknown. */
export function getPaymentProvider(): PaymentProvider | null {
  const id = process.env["PAYMENT_PROVIDER"]?.trim().toLowerCase();
  if (!id) return null;
  const factory = PROVIDERS.get(id);
  if (!factory) {
    console.warn(`[billing] PAYMENT_PROVIDER="${id}" is not a known gateway; payments are off.`);
    return null;
  }
  return factory();
}

export function billingEnabled(): boolean {
  return getPaymentProvider() !== null;
}
