import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertGuardianEmailAllowed } from "./guardian-email";
import {
  APPROVAL_VALID_DAYS,
  applyGuardianDecision,
  hashToken,
  newConsentToken,
} from "./guardian-consent.server";
import { UserInputError } from "./user-input-error";

function fakeAdmin(row: { user_id: string; status: string; requested_at: string | null } | null) {
  const updates: Record<string, unknown>[] = [];
  const client = {
    from: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referential test stub
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: row, error: null }),
        update: (patch: Record<string, unknown>) => {
          updates.push(patch);
          return { eq: async () => ({ error: null }) };
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;
  return { client, updates };
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const decide = (admin: SupabaseClient, action: "approve" | "withdraw") =>
  applyGuardianDecision(admin as never, {
    token: "t".repeat(64),
    action,
    ip: null,
    userAgent: null,
  });

describe("applyGuardianDecision", () => {
  it("approves a fresh link", async () => {
    const { client, updates } = fakeAdmin({
      user_id: "u1",
      status: "pending",
      requested_at: daysAgo(1),
    });
    expect(await decide(client, "approve")).toEqual({ ok: true, action: "approve" });
    expect(updates[0]).toMatchObject({ status: "granted" });
  });

  it("refuses an approve link older than the validity window", async () => {
    const { client, updates } = fakeAdmin({
      user_id: "u1",
      status: "pending",
      requested_at: daysAgo(APPROVAL_VALID_DAYS + 1),
    });
    expect(await decide(client, "approve")).toEqual({ ok: false, reason: "expired" });
    expect(updates).toEqual([]);
  });

  it("withdrawing never expires", async () => {
    const { client, updates } = fakeAdmin({
      user_id: "u1",
      status: "granted",
      requested_at: daysAgo(400),
    });
    expect(await decide(client, "withdraw")).toEqual({ ok: true, action: "withdraw" });
    expect(updates[0]).toMatchObject({ status: "withdrawn" });
  });

  it("rejects an unknown token", async () => {
    const { client, updates } = fakeAdmin(null);
    expect(await decide(client, "approve")).toEqual({ ok: false, reason: "invalid" });
    expect(updates).toEqual([]);
  });
});

describe("consent tokens", () => {
  it("are 256-bit random values stored only as a hash", () => {
    const { token, hash } = newConsentToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toBe(token);
    expect(newConsentToken().token).not.toBe(token);
  });
});

describe("assertGuardianEmailAllowed", () => {
  it("rejects the account's own address, whatever its case or spacing", () => {
    expect(() => assertGuardianEmailAllowed(" Sam@Example.com ", "sam@example.com")).toThrow(
      UserInputError,
    );
  });

  it("accepts a different address, and when the account email is unknown", () => {
    expect(() => assertGuardianEmailAllowed("parent@example.com", "sam@example.com")).not.toThrow();
    expect(() => assertGuardianEmailAllowed("parent@example.com", null)).not.toThrow();
  });
});
