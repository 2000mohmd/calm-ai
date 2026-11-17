import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail, parseSource } from "./waitlist";

describe("isValidEmail", () => {
  it("accepts normal addresses, including plus-tags", () => {
    for (const e of ["a@b.co", "first.last+tag@mail.example.com", "x_y-z@sub.domain.org"]) {
      expect(isValidEmail(e)).toBe(true);
    }
  });

  it("rejects malformed addresses", () => {
    for (const e of [
      "",
      "no-at.example.com",
      "a@@b.com",
      "a@b@c.com",
      "a b@c.com",
      "a@b c.com",
      "a@localhost",
      "a@b.",
      "a@.com",
      "a@b..com",
      "@b.com",
      "a\u0000@b.com",
      "a\n@b.com",
      "a\u007f@b.com",
    ]) {
      expect(isValidEmail(e), e).toBe(false);
    }
  });

  it("rejects addresses longer than 254 characters", () => {
    expect(isValidEmail(`${"a".repeat(248)}@ex.com`)).toBe(false); // 255 characters
    expect(isValidEmail(`${"a".repeat(247)}@ex.com`)).toBe(true); // 254 characters
  });
});

describe("normalizeEmail / parseSource", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Bar.COM \n")).toBe("foo@bar.com");
  });
  it("defaults unknown sources to final", () => {
    expect(parseSource("plans")).toBe("plans");
    expect(parseSource("footer")).toBe("footer");
    expect(parseSource("evil")).toBe("final");
    expect(parseSource(undefined)).toBe("final");
  });
});
