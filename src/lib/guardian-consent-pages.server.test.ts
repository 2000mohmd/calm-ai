import { describe, expect, it } from "vitest";
import {
  confirmPage,
  invalidPage,
  parseConsentRequest,
  resultPage,
} from "./guardian-consent-pages.server";

const TOKEN = "a1".repeat(32);

describe("parseConsentRequest", () => {
  it("accepts a 64-hex token with a known action", () => {
    expect(parseConsentRequest(TOKEN, "approve")).toEqual({ token: TOKEN, action: "approve" });
    expect(parseConsentRequest(TOKEN, "withdraw")).toEqual({ token: TOKEN, action: "withdraw" });
  });

  it.each([
    [null, "approve"],
    ["short", "approve"],
    [`${TOKEN}"><script>alert(1)</script>`, "approve"],
    [TOKEN.toUpperCase(), "approve"],
    [TOKEN, "delete"],
    [TOKEN, null],
    [123, "approve"],
  ])("rejects %j / %j", (token, action) => {
    expect(parseConsentRequest(token, action)).toBeNull();
  });
});

describe("pages", () => {
  it("the link only shows a confirmation form that POSTs; it changes nothing itself", async () => {
    const response = confirmPage(TOKEN, "approve");
    const html = await response.text();

    expect(html).toContain('<form method="post" action="/api/public/guardian-consent">');
    expect(html).toContain(`name="token" value="${TOKEN}"`);
    expect(html).toContain('name="action" value="approve"');
    expect(html).toMatch(/Yes, give permission/);
  });

  it("is never cached or framed", () => {
    const headers = confirmPage(TOKEN, "withdraw").headers;
    expect(headers.get("cache-control")).toBe("no-store");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("explains an expired link and offers a way forward", async () => {
    const html = await resultPage({ ok: false, reason: "expired" }).text();
    expect(html).toMatch(/expired/i);
    expect(html).toMatch(/send a new request/i);
  });

  it("confirms each outcome", async () => {
    expect(await resultPage({ ok: true, action: "approve" }).text()).toMatch(/permission given/i);
    expect(await resultPage({ ok: true, action: "withdraw" }).text()).toMatch(/withdrawn/i);
    expect(await invalidPage().text()).toMatch(/isn't valid/i);
  });
});
