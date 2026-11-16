import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyPlanEvent } from "./plan-grants.server";
import type { PlanEvent } from "./provider";

type Profile = { subscription_tier: string; subscription_current_period_end?: string | null };

let profiles: Record<string, Profile>;
let events: Map<string, string>;
let audit: Record<string, unknown>[];
let failProfileUpdate: boolean;

// Minimal in-memory stand-in for the slice of the Supabase client applyPlanEvent uses.
function fakeAdmin() {
  return {
    from(table: string) {
      if (table === "stripe_webhook_events") {
        return {
          insert: async (row: { id: string; type: string }) => {
            if (events.has(row.id)) return { error: { code: "23505", message: "duplicate" } };
            events.set(row.id, row.type);
            return { error: null };
          },
          delete: () => ({
            eq: async (_col: string, id: string) => {
              events.delete(id);
              return { error: null };
            },
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: (_col: string, id: string) => ({
              maybeSingle: async () => ({ data: profiles[id] ?? null, error: null }),
            }),
          }),
          update: (patch: Partial<Profile>) => ({
            eq: async (_col: string, id: string) => {
              if (failProfileUpdate) return { error: { message: "boom" } };
              Object.assign(profiles[id]!, patch);
              return { error: null };
            },
          }),
        };
      }
      return {
        insert: async (row: Record<string, unknown>) => {
          audit.push(row);
          return { error: null };
        },
      };
    },
  } as never;
}

const event = (over: Partial<PlanEvent> = {}): PlanEvent => ({
  eventId: "evt-1",
  type: "activated",
  userId: "u1",
  tier: "pro",
  ...over,
});

beforeEach(() => {
  profiles = { u1: { subscription_tier: "free" } };
  events = new Map();
  audit = [];
  failProfileUpdate = false;
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("applyPlanEvent", () => {
  it("activates a tier and records the period end and an audit row", async () => {
    const result = await applyPlanEvent(
      fakeAdmin(),
      event({ periodEnd: "2030-01-01T00:00:00Z", externalRef: "sub_1" }),
    );
    expect(result).toBe("applied");
    expect(profiles["u1"]).toEqual({
      subscription_tier: "pro",
      subscription_current_period_end: "2030-01-01T00:00:00Z",
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      admin_user_id: null,
      action: "plan_activated",
      target_id: "u1",
    });
  });

  it("is idempotent: a replayed event id changes nothing", async () => {
    const admin = fakeAdmin();
    await applyPlanEvent(admin, event());
    profiles["u1"]!.subscription_tier = "free"; // would flip back to pro if re-applied
    expect(await applyPlanEvent(admin, event())).toBe("duplicate");
    expect(profiles["u1"]!.subscription_tier).toBe("free");
    expect(audit).toHaveLength(1);
  });

  it("releases the claim when applying fails so a retry can succeed", async () => {
    const admin = fakeAdmin();
    failProfileUpdate = true;
    await expect(applyPlanEvent(admin, event())).rejects.toThrow("tier update failed");
    expect(events.has("evt-1")).toBe(false);
    failProfileUpdate = false;
    expect(await applyPlanEvent(admin, event())).toBe("applied");
    expect(profiles["u1"]!.subscription_tier).toBe("pro");
  });

  it("renewed moves a member to the renewed tier", async () => {
    profiles["u1"]!.subscription_tier = "pro";
    await applyPlanEvent(fakeAdmin(), event({ type: "renewed", tier: "premium" }));
    expect(profiles["u1"]!.subscription_tier).toBe("premium");
  });

  it("canceled downgrades to free when the member is on that tier", async () => {
    profiles["u1"] = { subscription_tier: "pro", subscription_current_period_end: "2030-01-01" };
    await applyPlanEvent(fakeAdmin(), event({ type: "canceled" }));
    expect(profiles["u1"]).toEqual({
      subscription_tier: "free",
      subscription_current_period_end: null,
    });
  });

  it("canceled for a different tier is ignored (late cancel of an old plan)", async () => {
    profiles["u1"]!.subscription_tier = "premium";
    expect(await applyPlanEvent(fakeAdmin(), event({ type: "canceled", tier: "pro" }))).toBe(
      "ignored",
    );
    expect(profiles["u1"]!.subscription_tier).toBe("premium");
  });

  it("payment_failed keeps the tier", async () => {
    profiles["u1"]!.subscription_tier = "pro";
    expect(await applyPlanEvent(fakeAdmin(), event({ type: "payment_failed" }))).toBe("ignored");
    expect(profiles["u1"]!.subscription_tier).toBe("pro");
    expect(audit).toHaveLength(0);
  });

  it("never touches org members", async () => {
    profiles["u1"]!.subscription_tier = "org";
    expect(await applyPlanEvent(fakeAdmin(), event())).toBe("ignored");
    expect(profiles["u1"]!.subscription_tier).toBe("org");
  });

  it("ignores events for unknown users", async () => {
    expect(await applyPlanEvent(fakeAdmin(), event({ userId: "ghost" }))).toBe("ignored");
  });
});
