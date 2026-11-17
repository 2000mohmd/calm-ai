import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const burstAllowed = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ insert }) },
}));
vi.mock("@/lib/burst-limit", () => ({ burstAllowed: (...a: unknown[]) => burstAllowed(...a) }));

import { handleWaitlist } from "./waitlist.server";

const EMAIL = "Secret.Person+x@Example.com";

function req(body: unknown, init: { method?: string; type?: string | null } = {}) {
  const method = init.method ?? "POST";
  const headers: Record<string, string> = { "x-forwarded-for": "203.0.113.9, 10.0.0.1" };
  if (init.type !== null) headers["content-type"] = init.type ?? "application/json";
  return new Request("https://calmai.site/api/public/waitlist", {
    method,
    headers,
    ...(method === "POST" ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  });
}

let logs = "";
beforeEach(() => {
  insert.mockReset().mockResolvedValue({ error: null });
  burstAllowed.mockReset().mockResolvedValue(true);
  logs = "";
  for (const m of ["log", "error", "warn", "info"] as const) {
    vi.spyOn(console, m).mockImplementation((...a: unknown[]) => {
      logs += a.map(String).join(" ");
    });
  }
});
afterEach(() => vi.restoreAllMocks());

describe("handleWaitlist", () => {
  it("stores a normalized email and returns ok with hardening headers", async () => {
    const res = await handleWaitlist(req({ email: ` ${EMAIL} `, source: "plans" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(insert).toHaveBeenCalledWith({ email: EMAIL.toLowerCase(), source: "plans" });
  });

  it("defaults the source to final", async () => {
    await handleWaitlist(req({ email: "a@b.co", source: "bogus" }));
    expect(insert).toHaveBeenCalledWith({ email: "a@b.co", source: "final" });
  });

  it("treats a duplicate (23505) as success", async () => {
    insert.mockResolvedValue({ error: { code: "23505" } });
    const res = await handleWaitlist(req({ email: EMAIL }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("400s on invalid, missing, oversized email, bad JSON and non-JSON type", async () => {
    const cases = [
      req({ email: "nope" }),
      req({}),
      req({ email: 5 }),
      req({ email: `${"a".repeat(250)}@b.co` }),
      req("{not json"),
      req({ email: "a@b.co" }, { type: "text/plain" }),
      req({ email: "a@b.co" }, { type: null }),
    ];
    for (const r of cases) {
      const res = await handleWaitlist(r);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Please enter a valid email address." });
    }
    expect(insert).not.toHaveBeenCalled();
  });

  it("429s when rate limited, with a hashed key and the global cap", async () => {
    burstAllowed.mockResolvedValue(false);
    const res = await handleWaitlist(req({ email: EMAIL }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many requests. Please try again later." });
    expect(insert).not.toHaveBeenCalled();
    const key = burstAllowed.mock.calls[0]?.[0] as string;
    expect(key).not.toContain("203.0.113.9");
    expect(burstAllowed.mock.calls[0]?.slice(1)).toEqual([5, 3_600_000]);

    burstAllowed.mockReset().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await handleWaitlist(req({ email: EMAIL }))).status).toBe(429);
    expect(burstAllowed.mock.calls[1]).toEqual(["waitlist-global", 300, 3_600_000]);
  });

  it("405s for non-POST", async () => {
    const res = await handleWaitlist(req(null, { method: "GET" }));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });

  it("500s with no details on DB error and never logs the email", async () => {
    insert.mockResolvedValue({ error: { code: "XX000", message: `boom ${EMAIL}` } });
    const res = await handleWaitlist(req({ email: EMAIL }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something went wrong." });
    expect(logs).not.toMatch(/secret\.person/i);
    expect(logs).not.toContain("boom");
  });
});
