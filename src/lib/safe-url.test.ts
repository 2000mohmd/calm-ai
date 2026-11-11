import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeReturnUrl } from "./safe-url";

const FALLBACK = "https://app.example.com/plans?checkout=success";

beforeEach(() => {
  vi.stubEnv("APP_BASE_URL", "https://app.example.com");
});
afterEach(() => vi.unstubAllEnvs());

describe("safeReturnUrl", () => {
  it("keeps URLs on this app's own origin", () => {
    expect(safeReturnUrl("https://app.example.com/settings?checkout=done", FALLBACK)).toBe(
      "https://app.example.com/settings?checkout=done",
    );
  });

  it("keeps the mobile app's deep link", () => {
    expect(safeReturnUrl("kalm://billing-done", FALLBACK)).toBe("kalm://billing-done");
  });

  it.each([
    "https://evil.example/steal",
    "https://app.example.com.evil.example/",
    "http://app.example.com/downgraded-scheme",
    "https://app.example.com:8443/other-port",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "intent://scan/#Intent;scheme=zxing;end",
    "not a url",
    "//evil.example/protocol-relative",
  ])("falls back for %s", (candidate) => {
    expect(safeReturnUrl(candidate, FALLBACK)).toBe(FALLBACK);
  });

  it("falls back when nothing is supplied", () => {
    expect(safeReturnUrl(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeReturnUrl(null, FALLBACK)).toBe(FALLBACK);
    expect(safeReturnUrl("", FALLBACK)).toBe(FALLBACK);
  });
});
