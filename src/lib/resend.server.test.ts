import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailDomain, sendEmail } from "./resend.server";

const base = { to: "someone@example.com", from: "Kalm <a@b.c>", subject: "Hi", text: "body" };

describe("sendEmail", () => {
  beforeEach(() => {
    process.env["RESEND_API_KEY"] = "re_test";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env["RESEND_API_KEY"];
  });

  it("returns no_api_key without calling fetch", async () => {
    delete process.env["RESEND_API_KEY"];
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await sendEmail(base)).toEqual({ ok: false, reason: "no_api_key" });
    expect(f).not.toHaveBeenCalled();
  });

  it("posts and returns ok", async () => {
    const f = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", f);
    expect(await sendEmail(base)).toEqual({ ok: true });
    const init = f.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(init.body as string).to).toEqual(["someone@example.com"]);
    expect(init.signal).toBeDefined();
  });

  it("truncates error bodies and logs only the domain", async () => {
    const f = vi.fn().mockResolvedValue(new Response("x".repeat(5000), { status: 422 }));
    vi.stubGlobal("fetch", f);
    const result = await sendEmail(base);
    expect(result).toEqual({ ok: false, reason: "http_error", status: 422 });
    const logged = String((console.error as ReturnType<typeof vi.fn>).mock.calls[0]![0]);
    expect(logged).not.toContain("someone@");
    expect(logged).toContain("@example.com");
    expect(logged.length).toBeLessThan(500);
  });

  it("returns network_error when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    expect(await sendEmail(base)).toEqual({ ok: false, reason: "network_error" });
  });
});

describe("emailDomain", () => {
  it("extracts the domain", () => {
    expect(emailDomain("a@b.com")).toBe("b.com");
    expect(emailDomain("nope")).toBe("unknown");
  });
});
