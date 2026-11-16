// Call sessions are written by the service-role client only; the crisis turn
// ends the call server-side and ending twice is a no-op.
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  adminUpdates: [] as { payload: Record<string, unknown>; filters: [string, unknown][] }[],
  adminResult: null as Record<string, unknown> | null,
  gate: vi.fn(),
  summarize: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from() {
      const filters: [string, unknown][] = [];
      let payload: Record<string, unknown> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referential test stub
      const chain: any = {
        update: (p: Record<string, unknown>) => {
          payload = p;
          return chain;
        },
        eq: (col: string, val: unknown) => {
          filters.push([col, val]);
          return chain;
        },
        select: () => chain,
        maybeSingle: async () => {
          h.adminUpdates.push({ payload, filters });
          return { data: h.adminResult, error: null };
        },
      };
      return chain;
    },
  },
}));
vi.mock("./crisis-gate.server", () => ({ runCrisisGate: (...a: unknown[]) => h.gate(...a) }));
vi.mock("./llm-provider.server", () => ({
  callCompanionModel: (...a: unknown[]) => h.summarize(...a),
}));
vi.mock("./ai-companion.server", () => ({ buildSystemPrompt: () => "" }));
vi.mock("./thread-summary.server", () => ({ fetchRecentSummaries: async () => [] }));

import { appendCallTurnCore, endCallSessionCore } from "./call-session.server";

const baseSession = {
  id: "s1",
  user_id: "u1",
  thread_id: "t1",
  status: "active",
  started_at: new Date(Date.now() - 120_000).toISOString(),
  transcript: [
    { role: "user", text: "hi", at: "2026-01-01T00:00:00Z" },
    { role: "assistant", text: "hello", at: "2026-01-01T00:00:01Z" },
  ],
};

const inserts: string[] = [];

function userClient(session: Record<string, unknown> | null) {
  const from = (table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referential test stub
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      update: () => chain,
      insert: () => {
        inserts.push(table);
        return chain;
      },
      maybeSingle: async () => ({ data: table === "call_sessions" ? session : null, error: null }),
      single: async () => ({ data: { id: "m1" }, error: null }),
    };
    return chain;
  };
  return { from } as never;
}

beforeEach(() => {
  h.adminUpdates.length = 0;
  h.adminResult = null;
  inserts.length = 0;
  h.gate.mockReset();
  h.summarize.mockReset();
});

describe("endCallSessionCore", () => {
  it("is idempotent: an already-ended session returns the stored row untouched", async () => {
    const ended = { ...baseSession, status: "ended", summary: "stored", duration_seconds: 90 };
    const result = await endCallSessionCore(userClient(ended), "u1", { session_id: "s1" });

    expect(result).toMatchObject({ summary: "stored", duration_seconds: 90 });
    expect(h.summarize).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(0);
    expect(h.adminUpdates).toHaveLength(0);
  });

  it("ends an active session via the admin client, pinned to the user", async () => {
    h.summarize.mockResolvedValue({ content: [{ type: "text", text: "A good chat." }] });
    h.adminResult = { ...baseSession, status: "ended" };
    await endCallSessionCore(userClient(baseSession), "u1", { session_id: "s1" });

    expect(h.adminUpdates).toHaveLength(1);
    const { payload, filters } = h.adminUpdates[0]!;
    expect(payload).toMatchObject({ status: "ended", summary: "A good chat." });
    expect(filters).toEqual(
      expect.arrayContaining([
        ["id", "s1"],
        ["user_id", "u1"],
        ["status", "active"],
      ]),
    );
  });
});

describe("appendCallTurnCore", () => {
  it("a crisis turn ends the session server-side", async () => {
    h.gate.mockResolvedValue({ crisis: { severity: "critical" } });
    h.adminResult = { turn_count: 3 };
    const result = await appendCallTurnCore(userClient(baseSession), "u1", {
      session_id: "s1",
      role: "user",
      text: "something alarming",
    });

    expect(result.crisis).toMatchObject({ severity: "critical" });
    expect(h.adminUpdates[0]!.payload).toMatchObject({
      status: "ended",
      end_reason: "crisis",
      crisis_triggered: true,
      ended_at: expect.any(String),
    });
  });

  it("rejects turns for an ended session", async () => {
    await expect(
      appendCallTurnCore(userClient({ ...baseSession, status: "ended" }), "u1", {
        session_id: "s1",
        role: "user",
        text: "hello again",
      }),
    ).rejects.toThrow(/ended/i);
    expect(h.adminUpdates).toHaveLength(0);
  });

  it("rejects a turn that loses the race with an end (guarded update matches no row)", async () => {
    h.gate.mockResolvedValue(null);
    h.adminResult = null;
    await expect(
      appendCallTurnCore(userClient(baseSession), "u1", {
        session_id: "s1",
        role: "assistant",
        text: "hello",
      }),
    ).rejects.toThrow(/ended/i);
  });
});
