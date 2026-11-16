// The paid human coach: a NEW request needs a paid plan; an
// already-open conversation is never cut off; the API answers 402.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetBurstLimits } from "./burst-limit";
import { COACH_PAID_ONLY, requestHumanSupportCore } from "./human-handoff.functions";
import { handle } from "@/routes/api/v1/-shared";

vi.mock("./human-handoff.server", () => ({
  summarizeForHuman: vi.fn(async () => null),
  sendHandoffAlertEmail: vi.fn(async () => false),
}));

function fakeSupabase(opts: { open: unknown; profile: Record<string, unknown>; thread?: unknown }) {
  const inserted: string[] = [];
  const from = (table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- self-referential test stub
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      update: () => chain,
      insert: () => {
        inserted.push(table);
        return chain;
      },
      maybeSingle: async () => ({
        data:
          table === "human_support_requests"
            ? opts.open
            : table === "profiles"
              ? opts.profile
              : table === "chat_threads"
                ? (opts.thread ?? null)
                : null,
        error: null,
      }),
      single: async () => ({
        data: { id: "req-1", status: "queued", created_at: "2026-01-01T00:00:00Z" },
        error: null,
      }),
    };
    return chain;
  };
  return { client: { from } as never, inserted };
}

const ask = (open: unknown, profile: Record<string, unknown>) => {
  const { client, inserted } = fakeSupabase({ open, profile });
  return { run: requestHumanSupportCore(client, "user-1", { note: "hi" }), inserted };
};

beforeEach(resetBurstLimits);

describe("human coach access", () => {
  it("free members cannot open a request", async () => {
    await expect(ask(null, { subscription_tier: "free" }).run).rejects.toThrow(COACH_PAID_ONLY);
  });

  it("free members do not create a request row", async () => {
    const { run, inserted } = ask(null, { subscription_tier: "free" });
    await expect(run).rejects.toThrow(COACH_PAID_ONLY);
    expect(inserted).not.toContain("human_support_requests");
  });

  it("pro / premium / org members can", async () => {
    for (const profile of [
      { subscription_tier: "pro" },
      { subscription_tier: "premium" },
      { subscription_tier: "org" },
    ]) {
      const { run, inserted } = ask(null, profile);
      expect((await run).already_open).toBe(false);
      expect(inserted).toContain("human_support_requests");
    }
  });

  it("an already-open conversation can always continue, plan or not", async () => {
    const open = { id: "req-9", status: "claimed", created_at: "2026-01-01T00:00:00Z" };
    const result = await ask(open, { subscription_tier: "free" }).run;
    expect(result).toMatchObject({ request_id: "req-9", already_open: true });
  });

  it("refuses a thread that isn't theirs (it would be summarised for staff)", async () => {
    const { client, inserted } = fakeSupabase({
      open: null,
      profile: { subscription_tier: "pro" },
      thread: null,
    });
    await expect(
      requestHumanSupportCore(client, "user-1", { thread_id: "someone-elses-thread" }),
    ).rejects.toThrow(/thread not found/i);
    expect(inserted).not.toContain("human_support_requests");
  });

  it("accepts their own thread", async () => {
    const { client } = fakeSupabase({
      open: null,
      profile: { subscription_tier: "pro" },
      thread: { id: "t1" },
    });
    expect(
      (await requestHumanSupportCore(client, "user-1", { thread_id: "t1" })).already_open,
    ).toBe(false);
  });

  it("is limited to 5 new requests an hour per member", async () => {
    const profile = { subscription_tier: "pro" };
    for (let i = 0; i < 5; i += 1) {
      await requestHumanSupportCore(fakeSupabase({ open: null, profile }).client, "user-9", {});
    }
    await expect(
      requestHumanSupportCore(fakeSupabase({ open: null, profile }).client, "user-9", {}),
    ).rejects.toThrow(/too many requests/i);
  });

  it("the API answers 402 Payment Required", async () => {
    const res = await handle(async () => {
      throw new Error(COACH_PAID_ONLY);
    });
    expect(res.status).toBe(402);
  });
});
