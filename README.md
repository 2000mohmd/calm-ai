# Kalm

An AI mental-wellness companion: chat and voice with a warm AI coach, mood and
habit tracking, guided exercises, PHQ-9 / GAD-7 check-ins, a deterministic
crisis gate in front of every model call, and a paid human-coach desk.

This repository is the **web app and the backend API** (`/api/v1`, used by the
mobile app). The mobile app lives in `kalm-mobile/`.

## Stack

TanStack Start (React 19, Vite, Nitro) · Supabase (Postgres + RLS, Auth) ·
OpenRouter (companion) · OpenAI (voice) · Stripe · Resend · Tailwind v4 +
shadcn/ui.

## Run it

```bash
npm install
cp .env.example .env     # fill in your Supabase, AI, Stripe and email keys
npm run dev              # http://localhost:8080
```

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `npm run typecheck` | TypeScript, no emit                                   |
| `npm run lint`      | ESLint (+ Prettier)                                   |
| `npm test`          | unit and contract tests (Vitest)                      |
| `npm run test:e2e`  | browser + API tests (Playwright, see `e2e/README.md`) |
| `npm run build`     | production build (Nitro preset via `NITRO_PRESET`)    |

## Documentation

- [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md): services, database, auth, deploy, scheduler, Stripe
- [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md): product, architecture, routes, risks
- [docs/MOBILE_API.md](docs/MOBILE_API.md): the `/api/v1` contract for the mobile app
- [docs/DATA_RETENTION.md](docs/DATA_RETENTION.md): data-retention proposal
- [docs/safety-upgrade-plan.md](docs/safety-upgrade-plan.md): design of the safety plan, human handoff and parental consent

Safety rule worth knowing before changing chat code: the crisis gate must run
**before** the rate limiter and before any model call (covered by
`src/lib/chat-messages-ordering.test.ts` and `crisis-gate.test.ts`).
