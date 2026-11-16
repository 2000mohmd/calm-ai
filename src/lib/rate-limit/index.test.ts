import { describe, expect, it, vi } from "vitest";

const tables = vi.hoisted(() => ({ used: [] as string[], upserts: [] as string[] }));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from(table: string) {
      tables.used.push(table);
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
        upsert: async () => {
          tables.upserts.push(table);
          return { error: null };
        },
      };
    },
  },
}));

import { getRateLimiter } from "./index";

describe("getRateLimiter", () => {
  it("uses the service-role client, ignoring the client passed in", async () => {
    const memberClient = {
      from: () => {
        throw new Error("member client must not be used by the limiter");
      },
    };
    const limiter = getRateLimiter(memberClient);

    const decision = await limiter.checkAndConsume("u1", { tier: "free", dailyCap: 8 });
    expect(decision.allowed).toBe(true);
    expect(tables.upserts).toContain("chat_rate_limits");

    await limiter.recordUsage("u1", {
      inputTokens: 1,
      outputTokens: 1,
      provider: "test",
      model: "test",
    } as never);
    expect(tables.used).toContain("chat_usage");
    expect(tables.upserts).toContain("chat_usage");
  });
});
