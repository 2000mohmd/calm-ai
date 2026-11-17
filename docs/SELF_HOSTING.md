# Running Calm AI on your own infrastructure

Calm AI is a standard TanStack Start (React 19 + Vite + Nitro) app backed by a
Supabase project. Sign-in goes
through Supabase directly, and the production build target is a Nitro preset you
choose.

## What you need

| Service                         | Used for                                                |
| ------------------------------- | ------------------------------------------------------- |
| **Supabase** (your own project) | Postgres + row-level security, Auth                     |
| **OpenRouter**                  | the companion, summaries, digests, crisis classifier    |
| **OpenAI**                      | voice notes (transcription) and live voice calls        |
| **Resend**                      | emails (crisis alerts, parent consent, nudges, support) |
| **Expo** (optional)             | push notifications to the mobile app                    |
| Node 22+                        | build and run                                           |

All settings are environment variables: see [.env.example](../.env.example).

## 1. Database (Supabase)

`supabase/migrations/` is the **complete** schema history (tables, row-level
security, functions, triggers, indexes, seed data). Create an empty Supabase
project and apply the migrations in filename order, either way:

```bash
supabase link --project-ref <ref>
supabase db push                 # applies every migration in order
```

or paste each file, oldest first, into the Supabase SQL editor.

Afterwards:

- Make your first admin (see "Admin roles and bootstrap" in
  [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)).
- If you change the schema, add a new migration and regenerate the types:
  ```bash
  supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts
  ```

### Auth settings (Supabase → Authentication)

- **URL configuration:** Site URL = your `APP_BASE_URL`; add to Redirect URLs:
  `https://calmai.site/**` and `kalm://auth-callback` (mobile app).
- **Providers:** Email (magic link) on. For Google and Apple, create the OAuth
  credentials yourself and enable the providers; the buttons only work once these are set.
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
curl -X POST https://calmai.site/api/public/hooks/evaluate-nudges \
  -H "x-sweep-secret: $NUDGE_SWEEP_SECRET"
```

The endpoint accepts `POST` with an `x-sweep-secret` header, or `GET` with
`Authorization: Bearer <secret>` (what Vercel Cron sends). Pick one scheduler:

- **Supabase `pg_cron`**: migration `20260831000000_job_queue_and_sweep_state.sql`
  schedules it every minute, reading the target from Vault. Run once with your
  values:
  ```sql
  select vault.create_secret('https://calmai.site/api/public/hooks/evaluate-nudges', 'kalm_sweep_url');
  select vault.create_secret('<your NUDGE_SWEEP_SECRET value>', 'kalm_sweep_secret');
  ```
- **Vercel Cron** (Pro plan only, optional): see [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).
- Or GitHub Actions / system cron calling the `curl` above.

Without a scheduler the app works, but nothing proactive happens.

## 4. Mobile app

In `kalm-mobile/src/lib/config.ts` set `WEB_BASE` (your domain),
`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the new values, and update
the addresses in `docs/MOBILE_API.md` for your developer.

## Deploy on Vercel

The full step-by-step is in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md). In short:

- `vercel.json` sets the build (`NITRO_PRESET=vercel bun run build`), `bun install`, and security
  headers (HSTS, `X-Frame-Options: DENY`, `nosniff`, referrer policy, microphone allowed for
  this origin only). It deliberately contains **no `crons` block**.
- `vite.config.ts` pins the Vercel functions to region `fra1` (Frankfurt, next to a
  `eu-central-1` Supabase project) with `maxDuration: 60`. Other presets ignore this.
- Import the repo (Framework: Other), set every REQUIRED variable from `.env.example`
  (Project → Settings → Environment Variables), deploy, then add your domain and set
  `APP_BASE_URL` to it.
- The scheduler defaults to Supabase `pg_cron` (section 3). Vercel Cron is optional and needs
  the Pro plan; a per-minute cron makes a **Hobby** deploy fail, which is why it is not in
  `vercel.json`.
- Uptime probe: `GET /api/public/health` returns `{"ok":true,"db":true}` (503 if the database is
  unreachable).
