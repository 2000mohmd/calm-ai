// Stripe webhook logic: the member's tier follows the subscription's CURRENT
// state at Stripe, so late or out-of-order deliveries can't resurrect a plan.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const h = vi.hoisted(() => ({ fetchSubscription: vi.fn() }));

vi.mock("./stripe.server", async (importOriginal) => ({
  // Keep the real StripeApiError class so instanceof checks line up.
  ...(await importOriginal<typeof import("./stripe.server")>()),
  fetchStripePrice: vi.fn(async () => ({ id: "price_x", lookup_key: null })),
  fetchStripeSubscription: h.fetchSubscription,
}));

import { StripeApiError } from "./stripe.server";
import { applyStripeEvent } from "./stripe-events.server";

function fakeAdmin() {
  const updates: { table: string; patch: Record<string, unknown>; filters: unknown[] }[] = [];
  const client = {
    from(table: string) {
      const record = { table, patch: {} as Record<string, unknown>, filters: [] as unknown[] };
      updates.push(record);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referential test stub
      const chain: any = {
        update: (patch: Record<string, unknown>) => {
          record.patch = patch;
          return chain;
        },
        eq: (col: string, value: unknown) => {
          record.filters.push([col, value]);
          return chain;
        },
        is: (col: string, value: unknown) => {
          record.filters.push(["is", col, value]);
          return chain;
        },
        then: (resolve: (value: unknown) => void) => resolve({ error: null, count: 1 }),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
  return { client, updates };
}

const subscription = (status: string, lookupKey = "pro_monthly") => ({
  id: "sub_1",
  customer: "cus_1",
  status,
  current_period_end: 1_900_000_000,
  items: {
    data: [{ price: { id: "price_1", lookup_key: lookupKey, recurring: { interval: "month" } } }],
  },
});

const event = (type: string, object: unknown) => ({
  id: "evt_1",
  type,
  data: { object: object as Record<string, unknown> },
});

beforeEach(() => {
  h.fetchSubscription.mockReset();
});

describe("applyStripeEvent", () => {
  it("applies the LIVE state: a stale 'updated' (active) after cancellation leaves the member free", async () => {
    // The delivered payload still says active; Stripe says it is now canceled.
    h.fetchSubscription.mockResolvedValue(subscription("canceled"));
    const { client, updates } = fakeAdmin();

    await applyStripeEvent(client, event("customer.subscription.updated", subscription("active")));

    expect(updates[0]?.patch).toMatchObject({
      subscription_tier: "free",
      stripe_subscription_status: "canceled",
      stripe_subscription_id: null,
      stripe_billing_interval: null,
    });
  });

  it("maps an active Pro subscription to the pro tier", async () => {
    h.fetchSubscription.mockResolvedValue(subscription("active", "pro_yearly"));
    const { client, updates } = fakeAdmin();

    await applyStripeEvent(
      client,
      event("customer.subscription.created", subscription("incomplete")),
    );

    expect(updates[0]?.patch).toMatchObject({
      subscription_tier: "pro",
      stripe_subscription_status: "active",
      stripe_subscription_id: "sub_1",
      stripe_billing_interval: "yearly",
    });
    expect(updates[0]?.filters).toEqual([["stripe_customer_id", "cus_1"]]);
  });

  it("trialing counts as entitled and keeps the status (it makes the trial one-per-person)", async () => {
    h.fetchSubscription.mockResolvedValue(subscription("trialing", "premium_monthly"));
    const { client, updates } = fakeAdmin();

    await applyStripeEvent(
      client,
      event("customer.subscription.updated", subscription("trialing")),
    );

    expect(updates[0]?.patch).toMatchObject({
      subscription_tier: "premium",
      stripe_subscription_status: "trialing",
    });
  });

  it("past_due and unpaid are not entitled", async () => {
    for (const status of ["past_due", "unpaid", "incomplete_expired"]) {
      h.fetchSubscription.mockResolvedValue(subscription(status));
      const { client, updates } = fakeAdmin();
      await applyStripeEvent(client, event("customer.subscription.updated", subscription(status)));
      expect(updates[0]?.patch).toMatchObject({ subscription_tier: "free" });
    }
  });

  it("'deleted' never calls Stripe and always ends the plan", async () => {
    const { client, updates } = fakeAdmin();

    await applyStripeEvent(client, event("customer.subscription.deleted", subscription("active")));

    expect(h.fetchSubscription).not.toHaveBeenCalled();
    expect(updates[0]?.patch).toMatchObject({
      subscription_tier: "free",
      stripe_subscription_status: "canceled",
      stripe_subscription_id: null,
    });
  });

  it("a subscription that no longer exists at Stripe (404) is treated as cancelled", async () => {
    h.fetchSubscription.mockImplementation(async () => {
      throw new StripeApiError(404, "resource_missing", "No such subscription");
    });
    const { client, updates } = fakeAdmin();

    await applyStripeEvent(client, event("customer.subscription.updated", subscription("active")));

    expect(updates[0]?.patch).toMatchObject({ subscription_tier: "free" });
  });

  it("any other Stripe failure propagates so the webhook answers 500 and Stripe retries", async () => {
    h.fetchSubscription.mockImplementation(async () => {
      throw new StripeApiError(500, undefined, "Stripe is down");
    });
    const { client, updates } = fakeAdmin();

    await expect(
      applyStripeEvent(client, event("customer.subscription.updated", subscription("active"))),
    ).rejects.toThrow(/Stripe is down/);
    expect(updates).toEqual([]);
  });

  it("checkout.session.completed only fills in a missing customer id", async () => {
    const { client, updates } = fakeAdmin();

    await applyStripeEvent(
      client,
      event("checkout.session.completed", { customer: "cus_9", metadata: { user_id: "u1" } }),
    );

    expect(updates[0]?.patch).toEqual({ stripe_customer_id: "cus_9" });
    expect(updates[0]?.filters).toEqual([
      ["id", "u1"],
      ["is", "stripe_customer_id", null],
    ]);
  });
});
