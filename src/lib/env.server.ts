// Startup env check. Names only, never values. Call warnMissingEnvOnce() from
// the server entry; it logs one line the first time and is silent afterwards.

/** Variables the app cannot run correctly without. */
export const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_BASE_URL",
  "NUDGE_SWEEP_SECRET",
  "RESEND_API_KEY",
  "ADMIN_ALERT_EMAIL",
] as const;

export function missingRequiredEnv(): string[] {
  const missing: string[] = REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
  if (!process.env["ANTHROPIC_API_KEY"]?.trim() && !process.env["OPENROUTER_API_KEY"]?.trim())
    missing.push("ANTHROPIC_API_KEY (or OPENROUTER_API_KEY)");
  return missing;
}

let warned = false;

export function warnMissingEnvOnce(): void {
  if (warned) return;
  warned = true;
  const missing = missingRequiredEnv();
  if (missing.length > 0) {
    console.warn(
      `[env] Missing required environment variable(s): ${missing.join(", ")}. See .env.example.`,
    );
  }
}
