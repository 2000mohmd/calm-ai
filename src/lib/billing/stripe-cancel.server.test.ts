import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelStripeSubscription, StripeApiError } from "./stripe.server";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubStripe(responses: { status: number; body: unknown }[]) {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
  const calls: { method: string; url: string }[] = [];
  const queue = [...responses];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ method: init.method ?? "GET", url });
      const next = queue.shift() ?? {
        status: 500,
        body: { error: { message: "unexpected call" } },
      };
      return new Response(JSON.stringify(next.body), { status: next.status });
    }),
  );
  return calls;
}

describe("cancelStripeSubscription", () => {
  it("cancels an active subscription (GET to check, then DELETE)", async () => {
    const calls = stubStripe([
      { status: 200, body: { id: "sub_1", status: "active" } },
      { status: 200, body: { id: "sub_1", status: "canceled" } },
    ]);

    await cancelStripeSubscription("sub_1");

    expect(calls.map((c) => c.method)).toEqual(["GET", "DELETE"]);
  });

  it("treats an already-canceled subscription as done, without a DELETE", async () => {
    const calls = stubStripe([{ status: 200, body: { id: "sub_1", status: "canceled" } }]);

    await cancelStripeSubscription("sub_1");

    expect(calls.map((c) => c.method)).toEqual(["GET"]);
  });

  it("treats a subscription Stripe has never heard of (404) as done", async () => {
    stubStripe([
      {
        status: 404,
        body: { error: { code: "resource_missing", message: "No such subscription: 'sub_1'" } },
      },
    ]);

    await expect(cancelStripeSubscription("sub_1")).resolves.toBeUndefined();
  });

  it("surfaces a real failure so account deletion can stop", async () => {
    stubStripe([{ status: 500, body: { error: { message: "Stripe is having a bad day" } } }]);

    await expect(cancelStripeSubscription("sub_1")).rejects.toBeInstanceOf(StripeApiError);
  });
});
