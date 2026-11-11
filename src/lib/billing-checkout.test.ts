// Checkout: a 3-day trial once per person; teens' links go to their guardian.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(async (_input: Record<string, unknown>) => ({
    id: "cs_1",
    url: "https://checkout.stripe.test/cs_1",
  })),
  sendGuardianPaymentEmail: vi.fn(async (_input: Record<string, unknown>) => true),
}));

vi.mock("./billing/stripe.server", () => ({
  createCheckoutSession: m.createCheckoutSession,
  ensureStripeCustomer: vi.fn(async () => "cus_1"),
  resolvePlanPriceId: vi.fn(async () => "price_1"),
}));
vi.mock("./guardian-consent.server", () => ({
  sendGuardianPaymentEmail: m.sendGuardianPaymentEmail,
}));

import { startCheckoutCore } from "./billing.functions";

function fakeSupabase(profile: Record<string, unknown>, guardian: unknown = null) {
  const from = (table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referential test stub
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({
        data: table === "profiles" ? profile : guardian,
        error: null,
      }),
    };
    return chain;
  };
  return {
    from,
    auth: { getUser: async () => ({ data: { user: { email: "me@example.test" } } }) },
  } as never;
}

const input = {
  plan: "pro" as const,
  interval: "monthly" as const,
  successUrl: "https://app.test/plans?checkout=success",
  cancelUrl: "https://app.test/plans?checkout=cancelled",
};

beforeEach(() => {
  vi.stubEnv("APP_BASE_URL", "https://app.test");
  m.createCheckoutSession.mockClear();
  m.sendGuardianPaymentEmail.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("startCheckoutCore", () => {
  it("never subscribed: Checkout starts with the 3-day trial", async () => {
    const result = await startCheckoutCore(fakeSupabase({ account_type: "general" }), "u1", input);
    expect(result).toEqual({ checkoutUrl: "https://checkout.stripe.test/cs_1", trialDays: 3 });
    expect(m.createCheckoutSession.mock.calls[0]?.[0]).toMatchObject({ trialDays: 3 });
  });

  it("subscribed before (any status): no second trial", async () => {
    const supabase = fakeSupabase({
      account_type: "general",
      stripe_subscription_status: "canceled",
    });
    const result = await startCheckoutCore(supabase, "u1", input);
    expect(result).toMatchObject({ trialDays: 0 });
    expect(m.createCheckoutSession.mock.calls[0]?.[0]).toMatchObject({ trialDays: 0 });
  });

  it("teen: the link is emailed to the guardian, never returned to the teen", async () => {
    const supabase = fakeSupabase(
      { account_type: "teen", preferred_name: "Sam" },
      { guardian_email: "parent@example.test", guardian_name: "Alex" },
    );
    const result = await startCheckoutCore(supabase, "u1", input);
    expect(result).toEqual({ sentToGuardian: true, trialDays: 3 });
    expect(m.sendGuardianPaymentEmail.mock.calls[0]?.[0]).toMatchObject({
      guardianEmail: "parent@example.test",
      checkoutUrl: "https://checkout.stripe.test/cs_1",
      trialDays: 3,
    });
    // The guardian has no account: Stripe sends them back to the public home page.
    expect(m.createCheckoutSession.mock.calls[0]?.[0]).toMatchObject({
      successUrl: "https://app.test/",
      cancelUrl: "https://app.test/",
    });
  });

  it("never sends Stripe's return to another site (open-redirect guard)", async () => {
    await startCheckoutCore(fakeSupabase({ account_type: "general" }), "u1", {
      ...input,
      successUrl: "https://evil.example/phish",
      cancelUrl: "javascript:alert(1)",
    });

    expect(m.createCheckoutSession.mock.calls[0]?.[0]).toMatchObject({
      successUrl: "https://app.test/plans?checkout=success",
      cancelUrl: "https://app.test/plans?checkout=cancelled",
    });
  });

  it("allows the mobile app's deep link as the return target", async () => {
    await startCheckoutCore(fakeSupabase({ account_type: "general" }), "u1", {
      ...input,
      successUrl: "kalm://billing/success",
      cancelUrl: "kalm://billing/cancel",
    });

    expect(m.createCheckoutSession.mock.calls[0]?.[0]).toMatchObject({
      successUrl: "kalm://billing/success",
      cancelUrl: "kalm://billing/cancel",
    });
  });

  it("teen with no guardian email on file: asks for it first, no Checkout created", async () => {
    const result = await startCheckoutCore(fakeSupabase({ account_type: "teen" }), "u1", input);
    expect(result).toEqual({ error: "guardian-email-missing" });
    expect(m.createCheckoutSession).not.toHaveBeenCalled();
  });
});
