// The plan catalogue: the ONE place plan names, display prices and tier ids are
// defined. Prices are display data only; the amount actually charged is
// configured in the payment gateway (map tier + interval to its price/product
// inside the gateway's PaymentProvider file).
//
// Limits (messages/day, calls/week) are NOT repeated here: they live in
// chat-limits.ts and reach the plans page via getBillingStatus, so the copy
// cannot drift from what is enforced. The words for each plan live in the i18n
// files under plans.catalog.<tier>.
//
// Prices (USD): Pro $18/mo, $180/yr. Premium $50/mo, $500/yr (10x monthly, i.e.
// two months free).

export type PaidTier = "pro" | "premium";
export type PlanTier = "free" | PaidTier;
export type BillingInterval = "monthly" | "yearly";

export const PAID_TIERS: PaidTier[] = ["pro", "premium"];
export const BILLING_INTERVALS: BillingInterval[] = ["monthly", "yearly"];

export const PLAN_CURRENCY = "USD";

export type PlanCatalogueEntry = {
  tier: PlanTier;
  /** Display price per interval, in whole units of PLAN_CURRENCY. */
  price: Record<BillingInterval, number>;
};

export const PLAN_CATALOGUE: PlanCatalogueEntry[] = [
  { tier: "free", price: { monthly: 0, yearly: 0 } },
  { tier: "pro", price: { monthly: 18, yearly: 180 } },
  { tier: "premium", price: { monthly: 50, yearly: 500 } },
];

export function isPaidTier(value: unknown): value is PaidTier {
  return value === "pro" || value === "premium";
}
