# Payments

Kalm's billing layer is gateway-agnostic. The app talks to a `PaymentProvider`
(`src/lib/billing/provider.ts`); a payment gateway (Stripe, Paddle, Lemon Squeezy,
Tap, Moyasar, ...) is one file implementing it. **No gateway is implemented yet**:
with `PAYMENT_PROVIDER` unset, billing is off:

- the plans page shows the plans with disabled "Payments launching soon" buttons,
- `POST /api/v1/billing/checkout` and `/portal` return `501 {"error":"Payments not enabled"}`,
- `/api/public/hooks/payments` returns `404 {"error":"Payments not enabled"}`.

Admins can still grant plans by hand (below), and `/api/v1/entitlements` is unchanged.

## Adding a gateway

1. Create `src/lib/billing/providers/<id>.server.ts` exporting a `PaymentProvider`:
   - `createCheckout({ userId, email, tier, interval, returnUrl, cancelUrl })` returns
     `{ url }`. Map `tier` (`pro` | `premium`) + `interval` (`monthly` | `yearly`) to the
     gateway's price/product, and pass `userId` as gateway metadata so the webhook can
     return it. `returnUrl`/`cancelUrl` are already validated against our origin.
   - `createPortal?({ userId, returnUrl })` returns `{ url }` for self-service
     manage/cancel. Optional; without it the portal endpoint answers 501.
   - `parseWebhook(request)` verifies the gateway signature and returns `PlanEvent[]`.
     **Throw on a bad signature or malformed body** (the route answers 400 and never
     echoes the message). Return `[]` for events we don't care about.
2. Register it with one line at the bottom of `provider.ts`:
   `registerPaymentProvider("<id>", () => myProvider);`
3. Set env vars: `PAYMENT_PROVIDER=<id>` plus whatever secrets the gateway file reads
   (read them inside the provider, so they are only required when it is selected).
4. In the gateway dashboard, point the webhook at
   `https://calmai.site/api/public/hooks/payments` (POST; GET is also routed for
   gateways that verify by GET).
5. Add the dependency (SDK) only in that gateway's file. Nothing else needs to change.

`PlanEvent`: `{ eventId, type: 'activated'|'renewed'|'canceled'|'payment_failed',
userId, tier, periodEnd?, externalRef? }`. `eventId` must be unique per gateway event
and stable across retries (it is the idempotency key).

## Tier rules (`src/lib/billing/plan-grants.server.ts`)

Applied with the service-role client only (a DB trigger rejects tier edits from anyone
else). The legacy `profiles.stripe_*` columns are never written.

| Event            | Effect                                                                               |
| ---------------- | ------------------------------------------------------------------------------------ |
| `activated`      | `subscription_tier = tier`; `subscription_current_period_end = periodEnd` if sent    |
| `renewed`        | same as `activated`                                                                  |
| `canceled`       | `free` and period end cleared, only if the member is currently on that `tier`        |
| `payment_failed` | tier unchanged; logged. The gateway's dunning should end in `canceled` if never paid |

- Send `canceled` when access should **end** (period end), not when the member clicks cancel.
- `org` members are never changed by payment events.
- Idempotent: each event id is claimed first in `stripe_webhook_events` (the table name is
  historical; it is a generic `id/type/created_at` table for any gateway). If applying
  fails the claim is released so the gateway's retry can succeed.
- Audit: each applied event writes an `admin_audit_log` row with `admin_user_id = null`
  (system actor; the column is nullable) and action `plan_activated` / `plan_renewed` /
  `plan_canceled`. `payment_failed` is console-logged only.
- Minors (`account_type = teen`) cannot start checkout.

## Plan catalogue and limits

Names, display prices and tier ids live in `src/lib/billing/plans.ts` (Pro $18/mo or
$180/yr, Premium $50/mo or $500/yr; display only, the gateway's own price is what is
charged). Message and call limits come from `src/lib/chat-limits.ts` and reach the plans
page through `getBillingStatus`, so the copy cannot drift from enforcement. Plan text is
in `src/lib/i18n/locales/{en,ar,fr}.json` under `plans.*`.

## Admin manual grant

Admin > Users > a member > **Set plan** (free / pro / premium / org) > Save. This calls
the `setUserPlan` server function (`assertAdmin`, service-role write, period end cleared)
and records a `changed_plan` row in the audit log with the acting admin. Use it for
gifts, support fixes, and to run the app before a gateway is chosen.
