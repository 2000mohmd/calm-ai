# Launch checklist (Vercel + Supabase)

Work top to bottom. Nothing here needs code changes.

## A. Vercel project

1. Vercel → Add New → Project → import the GitHub repo.
2. Framework Preset: **Other**. Leave build settings alone: `vercel.json` already sets
   `installCommand` (`bun install --frozen-lockfile`) and `buildCommand`
   (`NITRO_PRESET=vercel bun run build`). Functions run in `fra1` with a 60 s limit
   (set in `vite.config.ts`).
3. Project → Settings → Environment Variables (Production). `VITE_*` values are baked in at
   build time, so set them **before** the first deploy (or redeploy after changing them).

| Variable                                                    | Required             | Where to get it                                                                                                                                                                                        |
| ----------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`, `SUPABASE_URL`                         | yes                  | Supabase → Project Settings → API → Project URL                                                                                                                                                        |
| `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` | yes                  | Supabase → API → anon / publishable key                                                                                                                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | yes (secret)         | Supabase → API → service_role key. Server only; never prefix with `VITE_`                                                                                                                              |
| `APP_BASE_URL`                                              | yes                  | Your final origin, e.g. `https://calmai.site` (no trailing slash)                                                                                                                                      |
| `NUDGE_SWEEP_SECRET`                                        | yes (secret)         | Generate: `openssl rand -hex 32`                                                                                                                                                                       |
| `OPENROUTER_API_KEY`                                        | yes (secret)         | openrouter.ai → Keys                                                                                                                                                                                   |
| `RESEND_API_KEY`                                            | yes (secret)         | resend.com → API Keys (verify your sending domain first)                                                                                                                                               |
| `ADMIN_ALERT_EMAIL`                                         | yes                  | The inbox that must receive crisis and human-support alerts                                                                                                                                            |
| `EMAIL_FROM`                                                | recommended          | e.g. `Calm AI <hello@calmai.site>` on your verified Resend domain                                                                                                                                      |
| `EMAIL_UNSUBSCRIBE_SECRET`                                  | recommended (secret) | Generate: `openssl rand -hex 32`. Signs unsubscribe links; if unset a key is derived from the service-role key. Set it before the first email goes out (changing it later breaks links in sent emails) |
| `OPENAI_API_KEY`                                            | for voice            | platform.openai.com → API keys (voice notes and calls)                                                                                                                                                 |
| `CRON_SECRET`                                               | only for Vercel Cron | Same value as `NUDGE_SWEEP_SECRET`                                                                                                                                                                     |
| `CHAT_CHECKIN_ENABLED`, `POST_CRISIS_FOLLOWUP_ENABLED`      | optional             | `true` to enable                                                                                                                                                                                       |
| `EXPO_ACCESS_TOKEN`, `FCM_SERVICE_ACCOUNT_JSON`             | optional             | Push notifications only                                                                                                                                                                                |

Billing/plan variables are covered in `docs/PAYMENTS.md`. The server logs one warning at
first request naming any missing REQUIRED variable (never values): check
Deployments → Logs after the first hit.

4. Deploy. Note the `*.vercel.app` URL for early smoke tests.

## B. Custom domain

1. Project → Settings → Domains → Add `calmai.site` and `www.calmai.site`.
2. At your DNS provider create the records exactly **as shown in the Vercel dashboard**
   (typically `A 76.76.21.21` for an apex, `CNAME cname.vercel-dns.com` for a subdomain).
3. Wait for the green check and automatic HTTPS certificate.
4. Set `APP_BASE_URL=https://calmai.site` and redeploy (links in emails and unsubscribe URLs use it).

## C. Supabase

Database: apply every file in `supabase/migrations/` in order (`supabase db push`).

Authentication → URL Configuration:

- Site URL: `https://calmai.site`
- Redirect URLs: `https://calmai.site/**` and `kalm://auth-callback` (mobile app)

Providers: Email on. Google/Apple can be enabled later (create the OAuth credentials, paste
them in Authentication → Providers; the buttons only work once configured).

Email: Supabase's built-in mailer is heavily rate-limited. Authentication → SMTP Settings →
use Resend SMTP (host `smtp.resend.com`, port 465, user `resend`, password = your Resend API
key, sender on your verified domain), then edit the email templates.

## D. Scheduler (required: nudges, 12 h check-ins, email delivery, crisis escalation)

The endpoint `/api/public/hooks/evaluate-nudges` must be called every 1-2 minutes with
`x-sweep-secret: <NUDGE_SWEEP_SECRET>` (POST) or `Authorization: Bearer <secret>` (GET).
Crisis escalation emails (unreviewed events after 30 min) depend on it.

**Option 1 (default, works on every Vercel plan): Supabase pg_cron.** Migration
`20260831000000_job_queue_and_sweep_state.sql` schedules the call every minute and reads the
target from Vault. Run once in the SQL editor with your values:

```sql
select vault.create_secret('https://calmai.site/api/public/hooks/evaluate-nudges', 'kalm_sweep_url');
select vault.create_secret('<NUDGE_SWEEP_SECRET value>', 'kalm_sweep_secret');
```

Verify: `select * from cron.job_run_details order by start_time desc limit 5;` shows
succeeded runs, and the endpoint returns 200 JSON rather than 401. To rotate the secret, update
the Vault secret and the Vercel variable together.

**Option 2: Vercel Cron (Pro plan only).** `vercel.json` intentionally has **no `crons` block**:
on the free Hobby plan a per-minute cron makes the deployment fail. If you are on Pro, add
this to `vercel.json`, set `CRON_SECRET` equal to `NUDGE_SWEEP_SECRET`, and do not also run
pg_cron (it would double-call):

```json
"crons": [{ "path": "/api/public/hooks/evaluate-nudges", "schedule": "* * * * *" }]
```

## E. First admin

There is deliberately no UI path for the first `super_admin`. Sign up in the app first, then
in the SQL editor (table `public.user_roles`, enum `public.app_role`):

```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users where email = 'you@example.com'
on conflict (user_id, role) do nothing;
```

Note: an early migration also seeds a `super_admin` row for a specific email address. If that
is not you, review `select * from public.user_roles;` and remove stale grants.

## F. Smoke tests

- [ ] `GET https://calmai.site/api/public/health` returns `{"ok":true,"db":true}`.
- [ ] Response headers include `Strict-Transport-Security` and `X-Frame-Options: DENY`.
- [ ] Landing page, `/crisis` and `/legal` load without signing in; unknown URL shows the 404
      page with the crisis-help link.
- [ ] Sign up with email, receive the confirmation email from your domain, complete onboarding.
- [ ] Send a chat message; the companion replies.
- [ ] Voice: microphone prompt appears in chat and in a live call.
- [ ] Trigger a test crisis phrase with a test account: crisis resources appear, a row shows in
      `/admin/crisis`, and `ADMIN_ALERT_EMAIL` receives the alert within a minute (check
      `crisis_events.alert_sent_at` is set).
- [ ] `curl -i -X POST https://calmai.site/api/public/hooks/evaluate-nudges` returns 401;
      with the secret header returns 200 `{"ok":true,...}`.
- [ ] pg_cron (or Vercel Cron) shows runs every minute.
- [ ] Unsubscribe link in a proactive email works.
- [ ] `https://calmai.site/robots.txt` loads.

## Waitlist

The landing page "get notified" form writes to `public.waitlist_signups` (service role only;
no client access). It is rate limited (5 per hour per hashed client, 300 per hour overall).
Apply migration `20260918000000_waitlist.sql` before launch.

Export (Supabase SQL editor):

```sql
select email, source, created_at from public.waitlist_signups order by created_at;
```

Delete a person on request (they ask via Support or by replying to an email):

```sql
delete from public.waitlist_signups where lower(email) = lower('person@example.com');
```

## G. Backups and monitoring

- Supabase automatic daily backups and point-in-time recovery need the **Pro** plan. This app
  stores mental-health data, so run Pro (or schedule your own `pg_dump` to encrypted storage)
  before real users sign up. Test a restore once.
- Uptime: point an external monitor (UptimeRobot, Better Stack) at `/api/public/health`
  every minute and alert on non-200.
- Watch Vercel → Logs for `[env] Missing required environment variable(s)`, `crisis alert`
  and `sweep` errors; add a log drain or alert if you can.
- Alert on `crisis_events` rows with `reviewed = false` and `alert_sent_at is null`.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `NUDGE_SWEEP_SECRET` and API keys only in Vercel
  encrypted env vars; rotate them if exposed. See `SECURITY.md` and `DATA_RETENTION.md`.
