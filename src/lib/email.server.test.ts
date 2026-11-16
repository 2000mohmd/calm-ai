import { beforeEach, describe, expect, it } from "vitest";
import { unsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from "./email.server";

beforeEach(() => {
  process.env["EMAIL_UNSUBSCRIBE_SECRET"] = "test-secret";
  process.env["APP_BASE_URL"] = "https://app.test";
});

describe("unsubscribe token", () => {
  it("round-trips for the same user", async () => {
    const token = await unsubscribeToken("user-1");
    expect(await verifyUnsubscribeToken("user-1", token)).toBe(true);
  });

  it("rejects a token minted for a different user", async () => {
    const token = await unsubscribeToken("user-1");
    expect(await verifyUnsubscribeToken("user-2", token)).toBe(false);
  });

  it("rejects empty / garbage / missing inputs", async () => {
    expect(await verifyUnsubscribeToken("user-1", "")).toBe(false);
    expect(await verifyUnsubscribeToken("user-1", "deadbeef")).toBe(false);
    expect(await verifyUnsubscribeToken("", "whatever")).toBe(false);
  });

  it("changes when the secret changes (can't be forged without it)", async () => {
    const a = await unsubscribeToken("user-1");
    process.env["EMAIL_UNSUBSCRIBE_SECRET"] = "a-different-secret";
    const b = await unsubscribeToken("user-1");
    expect(a).not.toBe(b);
    expect(await verifyUnsubscribeToken("user-1", a)).toBe(false);
  });

  it("without a dedicated secret, never signs with the raw service-role key", async () => {
    delete process.env["EMAIL_UNSUBSCRIBE_SECRET"];
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "service-role-key";
    const derived = await unsubscribeToken("user-1");
    expect(await verifyUnsubscribeToken("user-1", derived)).toBe(true);

    // The token a raw-service-role-key HMAC would produce must NOT verify.
    process.env["EMAIL_UNSUBSCRIBE_SECRET"] = "service-role-key";
    const raw = await unsubscribeToken("user-1");
    delete process.env["EMAIL_UNSUBSCRIBE_SECRET"];
    expect(raw).not.toBe(derived);
    expect(await verifyUnsubscribeToken("user-1", raw)).toBe(false);
    delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
  });

  it("builds a URL to the public route carrying u and a valid t", async () => {
    const url = await unsubscribeUrl("user-1");
    expect(url.startsWith("https://app.test/api/public/unsubscribe?u=user-1&t=")).toBe(true);
    const token = new URL(url).searchParams.get("t");
    expect(token).toBeTruthy();
    expect(await verifyUnsubscribeToken("user-1", token as string)).toBe(true);
  });
});
