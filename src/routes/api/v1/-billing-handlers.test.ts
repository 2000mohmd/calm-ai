import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authImpl = vi.fn();
vi.mock("@/lib/api-auth.server", () => ({
  authenticateBearer: (request: Request) => authImpl(request),
}));

import { clearPaymentProviders, registerPaymentProvider } from "@/lib/billing/provider";
import { resetBurstLimits } from "@/lib/burst-limit";
import { handleBillingCheckout, handleBillingPortal } from "./-billing-handlers";

const supabase = {
  from: () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({
        data: { account_type: "adult", subscription_tier: "free" },
        error: null,
      }),
    };
    return chain;
  },
} as never;

const post = (body: unknown = { tier: "pro", interval: "monthly" }) =>
  new Request("https://api.test/api/v1/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: "Bearer x.y.z" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  authImpl.mockReset();
  authImpl.mockResolvedValue({ ok: true, userId: "u1", email: "a@b.test", supabase });
  vi.stubEnv("APP_BASE_URL", "https://app.test");
  resetBurstLimits();
});

afterEach(() => {
  vi.unstubAllEnvs();
  clearPaymentProviders();
});

describe("billing REST handlers", () => {
  it("checkout answers 501 when payments are not enabled", async () => {
    vi.stubEnv("PAYMENT_PROVIDER", "");
    const res = await handleBillingCheckout(post());
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: "Payments not enabled" });
    expect(authImpl).not.toHaveBeenCalled();
  });

  it("portal answers 501 when payments are not enabled", async () => {
    vi.stubEnv("PAYMENT_PROVIDER", "");
    const res = await handleBillingPortal(post({}));
    expect(res.status).toBe(501);
    expect(await res.json()).toEqual({ error: "Payments not enabled" });
  });

  it("checkout calls the provider with validated return urls when enabled", async () => {
    const createCheckout = vi.fn(async () => ({ url: "https://pay.test/c" }));
    registerPaymentProvider("fake", () => ({
      id: "fake",
      createCheckout,
      parseWebhook: async () => [],
    }));
    vi.stubEnv("PAYMENT_PROVIDER", "fake");
    const res = await handleBillingCheckout(
      post({ tier: "premium", interval: "yearly", return_url: "https://evil.test/x" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://pay.test/c" });
    expect(createCheckout).toHaveBeenCalledWith({
      userId: "u1",
      email: "a@b.test",
      tier: "premium",
      interval: "yearly",
      // the off-origin return_url fell back to our own page
      returnUrl: "https://app.test/plans?checkout=success",
      cancelUrl: "https://app.test/plans?checkout=cancelled",
    });
  });

  it("portal answers 501 when the provider has no portal", async () => {
    registerPaymentProvider("fake", () => ({
      id: "fake",
      createCheckout: async () => ({ url: "x" }),
      parseWebhook: async () => [],
    }));
    vi.stubEnv("PAYMENT_PROVIDER", "fake");
    const res = await handleBillingPortal(post({}));
    expect(res.status).toBe(501);
  });

  it("rejects an invalid tier with 400 when enabled", async () => {
    registerPaymentProvider("fake", () => ({
      id: "fake",
      createCheckout: async () => ({ url: "x" }),
      parseWebhook: async () => [],
    }));
    vi.stubEnv("PAYMENT_PROVIDER", "fake");
    const res = await handleBillingCheckout(post({ tier: "org", interval: "monthly" }));
    expect(res.status).toBe(400);
  });
});
