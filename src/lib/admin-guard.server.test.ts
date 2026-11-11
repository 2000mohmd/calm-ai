import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAdmin, assertSuperAdmin } from "./admin-guard.server";

type Roles = { admin?: boolean | Error; super_admin?: boolean | Error };

function fakeSupabase(roles: Roles) {
  return {
    rpc: async (_fn: string, args: { _role: "admin" | "super_admin" }) => {
      const value = roles[args._role] ?? false;
      return value instanceof Error
        ? { data: null, error: { message: value.message } }
        : { data: value, error: null };
    },
  } as unknown as SupabaseClient<never> as never;
}

describe("assertAdmin", () => {
  it("lets admins and super-admins through", async () => {
    await expect(assertAdmin(fakeSupabase({ admin: true }), "u")).resolves.toBeUndefined();
    await expect(assertAdmin(fakeSupabase({ super_admin: true }), "u")).resolves.toBeUndefined();
  });

  it("refuses everyone else", async () => {
    await expect(assertAdmin(fakeSupabase({}), "u")).rejects.toThrow("Forbidden");
  });

  it("fails closed when a role lookup errors, even if the other role says yes", async () => {
    await expect(
      assertAdmin(fakeSupabase({ admin: true, super_admin: new Error("db down") }), "u"),
    ).rejects.toThrow("db down");
    await expect(assertAdmin(fakeSupabase({ admin: new Error("db down") }), "u")).rejects.toThrow(
      "db down",
    );
  });
});

describe("assertSuperAdmin", () => {
  it("an admin alone cannot manage roles", async () => {
    await expect(assertSuperAdmin(fakeSupabase({ admin: true }), "u")).rejects.toThrow("Forbidden");
  });

  it("a super-admin can", async () => {
    await expect(
      assertSuperAdmin(fakeSupabase({ super_admin: true }), "u"),
    ).resolves.toBeUndefined();
  });
});
