import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { introSpent, introSpentWithCurrent, introUsage } from "./intro-usage.server";

describe("intro allowance arithmetic", () => {
  it("counts stored messages when nothing was deleted", () => {
    expect(introSpent({ stored: 7, answered: 6 })).toBe(7);
  });

  it("deleting messages cannot lower what has been spent", () => {
    expect(introSpent({ stored: 0, answered: 15 })).toBe(15);
  });

  it("the message in hand counts even though it isn't answered yet", () => {
    // 14 replies given, 15th message stored: 15 spent, the cap of 15 not exceeded.
    expect(introSpentWithCurrent({ stored: 15, answered: 14 })).toBe(15);
    // 15 replies given, then the conversation was deleted: the new message is #16.
    expect(introSpentWithCurrent({ stored: 1, answered: 15 })).toBe(16);
  });
});

describe("introUsage", () => {
  it("reads the stored user-message count and the lifetime reply count", async () => {
    const calls: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
    const query = (table: string): any => {
      calls.push(table);
      const result =
        table === "chat_messages"
          ? { count: 4, error: null }
          : { data: { lifetime_messages: 9 }, error: null };
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => result,
        then: (resolve: (value: unknown) => void) => resolve(result),
      };
      return chain;
    };
    const client = { from: query } as unknown as SupabaseClient<never>;

    expect(await introUsage(client as never, "u1")).toEqual({ stored: 4, answered: 9 });
    expect(calls.sort()).toEqual(["chat_messages", "chat_usage"]);
  });

  it("treats a missing usage row as zero replies", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
    const query = (table: string): any => {
      const result =
        table === "chat_messages" ? { count: 2, error: null } : { data: null, error: null };
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => result,
        then: (resolve: (value: unknown) => void) => resolve(result),
      };
      return chain;
    };
    const client = { from: query } as unknown as SupabaseClient<never>;

    expect(await introUsage(client as never, "u1")).toEqual({ stored: 2, answered: 0 });
  });
});
