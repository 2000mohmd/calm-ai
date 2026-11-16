import { beforeEach, describe, expect, it, vi } from "vitest";
import { unsubscribeToken } from "./email.server";
import { unsubscribeApply, unsubscribeConfirm } from "./unsubscribe.server";

const updates: { values: unknown; id: string }[] = [];

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      update: (values: unknown) => ({
        eq: async (_col: string, id: string) => {
          updates.push({ values, id });
          return { error: null };
        },
      }),
    }),
  },
}));

const USER = "11111111-2222-3333-4444-555555555555";
const BASE = "https://app.test/api/public/unsubscribe";

beforeEach(() => {
  updates.length = 0;
  process.env["EMAIL_UNSUBSCRIBE_SECRET"] = "test-secret";
});

describe("unsubscribe confirm (GET)", () => {
  it("shows a form with security headers and does not change anything", async () => {
    const t = await unsubscribeToken(USER);
    const res = await unsubscribeConfirm(new Request(`${BASE}?u=${USER}&t=${t}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    const html = await res.text();
    expect(html).toContain('<form method="post"');
    expect(html).toContain(`name="u" value="${USER}"`);
    expect(updates).toEqual([]);
  });

  it("rejects a bad token, a non-uuid user id, and missing params", async () => {
    const t = await unsubscribeToken(USER);
    const bad = "0".repeat(64);
    expect((await unsubscribeConfirm(new Request(`${BASE}?u=${USER}&t=${bad}`))).status).toBe(400);
    expect((await unsubscribeConfirm(new Request(`${BASE}?u="><x&t=${t}`))).status).toBe(400);
    expect((await unsubscribeConfirm(new Request(BASE))).status).toBe(400);
  });
});

describe("unsubscribe apply (POST)", () => {
  it("applies from the confirmation form body", async () => {
    const t = await unsubscribeToken(USER);
    const res = await unsubscribeApply(
      new Request(BASE, { method: "POST", body: new URLSearchParams({ u: USER, t }) }),
    );
    expect(res.status).toBe(200);
    expect(updates).toEqual([{ values: { email_opt_out: true }, id: USER }]);
  });

  it("still honors the RFC 8058 one-click POST (credentials in the URL)", async () => {
    const t = await unsubscribeToken(USER);
    const res = await unsubscribeApply(
      new Request(`${BASE}?u=${USER}&t=${t}`, {
        method: "POST",
        body: new URLSearchParams({ "List-Unsubscribe": "One-Click" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(updates).toHaveLength(1);
  });

  it("rejects a forged token without writing", async () => {
    const res = await unsubscribeApply(
      new Request(BASE, {
        method: "POST",
        body: new URLSearchParams({ u: USER, t: "f".repeat(64) }),
      }),
    );
    expect(res.status).toBe(400);
    expect(updates).toEqual([]);
  });
});
