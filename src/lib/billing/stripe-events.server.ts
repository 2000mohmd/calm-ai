// Applies a verified Stripe webhook event to the member's profile.
//
// The subscription events are the source of truth for profiles.subscription_tier
// (Stripe sends them on every plan change, renewal, payment failure and
// cancellation). Webhook deliveries can arrive late or out of order, so for
// subscription events we apply the subscription's CURRENT state fetched from
// Stripe, not the event payload: a stale "updated" delivered after "deleted"
// can then never resurrect a cancelled plan.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchStripePrice,
  fetchStripeSubscription,
  StripeApiError,
  type StripeSubscription,
} from "./stripe.server";
import { intervalFromStripe, planFromEnvPriceId, planFromLookupKey } from "./plans";

export type StripeEvent = { id: string; type: string; data: { object: Record<string, unknown> } };

const SUBSCRIPTION_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

/** Subscription states that unlock the paid tier (past_due is deliberately not one). */
const ENTITLED = ["active", "trialing"];

async function currentSubscription(
  event: StripeEvent,
  payload: StripeSubscription,
): Promise<StripeSubscription> {
  if (event.type === "customer.subscription.deleted") return { ...payload, status: "canceled" };
  try {
    return await fetchStripeSubscription(payload.id);
  } catch (error) {
    // Gone from Stripe: treat as cancelled. Anything else: let Stripe retry.
    if (error instanceof StripeApiError && error.status === 404) {
      return { ...payload, status: "canceled" };
    }
    throw error;
  }
}

export async function applyStripeEvent(
  supabaseAdmin: SupabaseClient,
  event: StripeEvent,
): Promise<void> {
  if (SUBSCRIPTION_EVENTS.includes(event.type)) {
    const subscription = await currentSubscription(
      event,
      event.data.object as unknown as StripeSubscription,
    );
    const price = subscription.items?.data?.[0]?.price ?? null;
    const active = ENTITLED.includes(subscription.status);

    // Which plan and cadence the subscription is actually on: the price's
    // lookup_key ("pro_yearly"), then the pinned env ids, then a Stripe fetch.
    let resolved = planFromLookupKey(price?.lookup_key) ?? planFromEnvPriceId(price?.id ?? null);
    let interval = resolved?.interval ?? intervalFromStripe(price?.recurring?.interval ?? null);

    if (!resolved && price?.id) {
      try {
        const fetched = await fetchStripePrice(price.id);
        resolved = planFromLookupKey(fetched.lookup_key);
        interval = resolved?.interval ?? intervalFromStripe(fetched.recurring?.interval ?? null);
      } catch (err) {
        console.error("stripe webhook: could not fetch price", price.id, err);
      }
    }

    if (active && !resolved) {
      // Don't silently downgrade a paying customer because we couldn't map the
      // price: keep them premium (the more generous of the two) and shout.
      console.error(
        "stripe webhook: active subscription on an unrecognised price",
        price?.id,
        price?.lookup_key,
      );
    }

    const ended = subscription.status === "canceled";
    const update = {
      stripe_subscription_id: ended ? null : subscription.id,
      // The status is kept after cancellation on purpose: "has ever subscribed"
      // is what makes the free trial one-per-person.
      stripe_subscription_status: subscription.status,
      stripe_price_id: price?.id ?? null,
      stripe_billing_interval: active ? (interval ?? null) : null,
      subscription_current_period_end: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
      subscription_tier: active ? (resolved?.plan ?? "premium") : "free",
    };

    // stripe_customer_id is the reliable join key (set at checkout time);
    // metadata.user_id is a redundant cross-check, logged rather than trusted.
    const { error, count } = await supabaseAdmin
      .from("profiles")
      .update(update, { count: "exact" })
      .eq("stripe_customer_id", subscription.customer);
    if (error) throw error;
    if (!count) {
      console.error(
        "stripe webhook: no profile found for stripe_customer_id",
        subscription.customer,
        "metadata.user_id was",
        subscription.metadata?.user_id,
      );
    }
    return;
  }

  if (event.type === "checkout.session.completed") {
    // Safety net: stamps the customer id if checkout started without one. Never
    // overwrites an id that's already set.
    const session = event.data.object as {
      customer: string | null;
      metadata?: { user_id?: string };
    };
    if (session.customer && session.metadata?.user_id) {
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: session.customer })
        .eq("id", session.metadata.user_id)
        .is("stripe_customer_id", null);
    }
  }
  // Other event types are fine to ignore: Stripe sends far more than we act on.
}
