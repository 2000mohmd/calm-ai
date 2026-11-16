import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. These run against the app served by the Vite dev server on
 * :8080 (the production build uses the cloudflare-module Nitro preset, which
 * needs `wrangler dev` rather than `vite preview` — not worth the extra moving
 * part for a smoke suite). The vitest suite (`npm test`) covers unit/contract
 * logic; this covers the actual rendered app + the HTTP API surface.
 *
 * To run: `bun run test:e2e`. First run needs `bunx playwright install chromium`.
 * If a dev server is already up on :8080 it is reused.
 */
// The signed-in specs talk to Supabase directly (e2e/session.ts), so they need
// the same VITE_SUPABASE_* values the app reads. Already-set env vars win.
try {
  process.loadEnvFile();
} catch {
  // no .env — fine, the signed-in specs skip themselves
}

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // `.e2e.ts`, not `.spec.ts` — keeps these out of vitest's default glob so the
  // two runners never fight over the same files.
  testMatch: "**/*.e2e.ts",
  globalSetup: "./e2e/warmup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `npm run dev`,
    url: BASE_URL,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
