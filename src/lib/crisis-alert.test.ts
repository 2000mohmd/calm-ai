// crisis_events is written with the service-role client, and a second alert
// email for the same user inside 10 minutes is suppressed (the row is still written).
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  recent: [] as { id: string }[],
  inserted: [] as Record<string, unknown>[],
  sendEmail: vi.fn(async (..._args: unknown[]) => ({ ok: true })),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      if (table !== "crisis_events") throw new Error(`unexpected table: ${table}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referential test stub
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        limit: async () => ({ data: h.recent, error: null }),
        insert: (row: Record<string, unknown>) => {
          h.inserted.push(row);
          return chain;
        },
        update: () => chain,
        single: async () => ({
          data: { id: "evt-1", created_at: "2026-01-01T00:00:00Z" },
          error: null,
        }),
      };
      return chain;
    },
  },
}));
vi.mock("./resend.server", () => ({ sendEmail: (...a: unknown[]) => h.sendEmail(...a) }));

import { logCrisisEvent } from "./crisis-alert.server";

const input = { userId: "u1", source: "chat", severity: "critical" as const };
// The caller's client must never be touched.
const memberClient = {
  from: () => {
    throw new Error("member client must not be used");
  },
} as never;

beforeEach(() => {
  h.recent = [];
  h.inserted.length = 0;
  h.sendEmail.mockClear();
  process.env["ADMIN_ALERT_EMAIL"] = "admin@example.test";
});

describe("logCrisisEvent", () => {
  it("inserts through the admin client and emails the first alert", async () => {
    const id = await logCrisisEvent(memberClient, input);

    expect(id).toBe("evt-1");
    expect(h.inserted).toHaveLength(1);
    expect(h.inserted[0]).toMatchObject({ user_id: "u1", severity: "critical" });
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("still inserts the event but sends no email when one was alerted in the last 10 minutes", async () => {
    h.recent = [{ id: "earlier" }];
    const id = await logCrisisEvent(memberClient, input);

    expect(id).toBe("evt-1");
    expect(h.inserted).toHaveLength(1);
    expect(h.sendEmail).not.toHaveBeenCalled();
  });
});
