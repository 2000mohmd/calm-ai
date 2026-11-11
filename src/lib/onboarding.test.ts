// Onboarding runs once. Re-running it must never undo teen mode or the
// guardian-consent gate, and a guardian can't be the teen themselves.
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { completeOnboardingCore } from "./onboarding.functions";
import { UserInputError } from "./user-input-error";

type Rows = Record<string, Record<string, unknown> | null>;

function fakeSupabase(rows: Rows) {
  const writes: string[] = [];
  const client = {
    from: (table: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referential test stub
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: rows[table] ?? null, error: null }),
      };
      for (const write of ["insert", "update", "upsert", "delete"]) {
        chain[write] = () => {
          writes.push(`${table}.${write}`);
          return chain;
        };
      }
      return chain;
    },
  } as unknown as SupabaseClient;
  return { client: client as never, writes };
}

const yearsAgo = (years: number) => `${new Date().getUTCFullYear() - years}-01-15`;

const input = (overrides: Record<string, unknown> = {}) => ({
  preferred_name: "Sam",
  account_type: "general",
  privacy_consent: true,
  ai_context_consent: true,
  date_of_birth: yearsAgo(15),
  baseline_mood: 3,
  ...overrides,
});

describe("completeOnboardingCore", () => {
  it("a second run changes nothing, so a teen can't resubmit as an adult", async () => {
    const { client, writes } = fakeSupabase({
      profiles: { onboarding_completed: true },
      user_profiles: { care_plan: "Start gently.", care_plan_focus: ["Sleep"] },
    });

    const result = await completeOnboardingCore(
      client,
      "teen-1",
      input({ date_of_birth: yearsAgo(30), account_type: "general" }),
    );

    expect(result).toEqual({ ok: true, care_plan: "Start gently.", care_plan_focus: ["Sleep"] });
    expect(writes).toEqual([]);
  });

  it("returns an empty plan, not an error, if the stored plan is missing", async () => {
    const { client } = fakeSupabase({
      profiles: { onboarding_completed: true },
      user_profiles: null,
    });
    expect(await completeOnboardingCore(client, "u", input())).toEqual({
      ok: true,
      care_plan: null,
      care_plan_focus: [],
    });
  });

  it("refuses a teen's own email as their guardian, before writing anything", async () => {
    const { client, writes } = fakeSupabase({ profiles: null });

    await expect(
      completeOnboardingCore(
        client,
        "teen-2",
        input({ guardian_email: "Sam@Example.com" }),
        "sam@example.com",
      ),
    ).rejects.toBeInstanceOf(UserInputError);
    expect(writes).toEqual([]);
  });

  it("rejects an invalid date of birth and under-13s as input errors", async () => {
    const { client } = fakeSupabase({ profiles: null });
    await expect(
      completeOnboardingCore(client, "u", input({ date_of_birth: "2026-02-31" })),
    ).rejects.toBeInstanceOf(UserInputError);
    await expect(
      completeOnboardingCore(client, "u", input({ date_of_birth: yearsAgo(9) })),
    ).rejects.toBeInstanceOf(UserInputError);
  });
});
