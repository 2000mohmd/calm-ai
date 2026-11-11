# Running Kalm on your own infrastructure

Kalm is a standard TanStack Start (React 19 + Vite + Nitro) app backed by a
Supabase project. Nothing in the code depends on Lovable any more: sign-in goes
through Supabase directly, Stripe through its own API, and the production build
target is a Nitro preset you choose.

## What you need

| Service                         | Used for                                                |
| ------------------------------- | ------------------------------------------------------- |
| **Supabase** (your own project) | Postgres + row-level security, Auth                     |
| **OpenRouter**                  | the companion, summaries, digests, crisis classifier    |
| **OpenAI**                      | voice notes (transcription) and live voice calls        |
| **Stripe**                      | Pro / Premium subscriptions and the 3-day trial         |
| **Resend**                      | emails (crisis alerts, parent consent, nudges, support) |
| **Expo** (optional)             | push notifications to the mobile app                    |
| Node 22+                        | build and run                                           |

All settings are environment variables: see [.env.example](../.env.example).

## 1. Database (Supabase)

The schema has **34 tables**, but `supabase/migrations/` only creates a handful
of them. The rest were applied by Lovable straight to its hosted database and
were never written to git, so the database can't be rebuilt from this repo
alone. Do this once, from the old (Lovable Cloud) database:

1. Get the old database's connection string (Lovable Cloud → Database).
2. Dump the **schema** (tables, row-level-security policies, functions,
   triggers, indexes) and import it into the new project:
   ```bash
   supabase db dump --db-url "<old connection string>" -f schema.sql
   psql "<new connection string>" -f schema.sql
   ```
3. Copy the **reference data** that lives in tables, not code: `exercises`,
   `care_resources`, `daily_prompts` (and `user_roles` for your admin
   account). Skip this and the exercise library and care resources are empty.
4. Optional, only if real members exist: copy the user data and `auth.users`.
   Passwords aren't used (email link / OAuth), but sign-in identities must move
   with the users or they'd have to re-register.
5. Regenerate the TypeScript types so the casts marked "until the types are
   regenerated" can be removed:
   ```bash
   supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts
   ```

Then commit the dump as a baseline migration so the repo is complete.

### Auth settings (Supabase → Authentication)

- **URL configuration:** Site URL = your `APP_BASE_URL`; add to Redirect URLs:
  `https://<your-domain>/**` and `kalm://auth-callback` (mobile app).
- **Providers:** Email (magic link) on. For Google and Apple, create the OAuth
  credentials yourself and enable the providers: Lovable's shared sign-in
  broker is gone, so the buttons only work once these are set.
- **Email templates / SMTP:** configure sender and templates (Supabase's
  built-in mailer is rate-limited; use your own SMTP, e.g. Resend).

## 2. Build and run

```bash
npm install
cp .env.example .env     # fill it in
npm run dev              # http://localhost:8080
npm run typecheck && npm run lint && npm test
```

The production build target is a Nitro preset (`NITRO_PRESET`); default is
Cloudflare Workers.

```bash
# Any Node host (VPS, container, Hostinger Node hosting, Render, Railway…)
NITRO_PRESET=node-server npm run build
PORT=3000 node .output/server/index.mjs

# Cloudflare Workers (default)
npm run build && npx wrangler deploy
```

`VITE_*` variables are baked in at **build** time; everything else is read at
runtime from the server's environment.

## 3. Scheduled sweep

Proactive nudges, the 12-hour check-in, weekly digests and email delivery all
run from one endpoint that a scheduler must call every **1-2 minutes**:

```bash
curl -X POST https://<your-domain>/api/public/hooks/evaluate-nudges \
  -H "x-sweep-secret: $NUDGE_SWEEP_SECRET"
```

Use any scheduler: Supabase `pg_cron` + `pg_net`, a Cloudflare cron trigger,
GitHub Actions, or system cron. (The previous schedule lived in Lovable and
isn't in this repo.) Without it the app works, but nothing proactive happens.

## 4. Stripe

Create the four prices with lookup keys `pro_monthly`, `pro_yearly`,
`premium_monthly`, `premium_yearly` (or pin them with the
`STRIPE_*_PRICE_ID` variables), and a webhook endpoint at
`https://<your-domain>/api/public/hooks/stripe-webhook` subscribed to
`checkout.session.completed` and `customer.subscription.created / updated /
deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.

## 5. Mobile app

In `kalm-mobile/src/lib/config.ts` set `WEB_BASE` (your domain),
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the new values, and update
the addresses in `docs/MOBILE_API.md` for your developer.
