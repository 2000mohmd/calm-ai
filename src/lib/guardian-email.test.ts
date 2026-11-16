import { describe, expect, it } from "vitest";
import { assertGuardianEmailAllowed, normalizeEmail } from "./guardian-email";
import { UserInputError } from "./user-input-error";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Foo@Example.COM ")).toBe("foo@example.com");
  });

  it("strips +tag on any domain but keeps dots outside Gmail", () => {
    expect(normalizeEmail("a.b+x@example.com")).toBe("a.b@example.com");
  });

  it("strips dots and +tag on gmail and googlemail", () => {
    expect(normalizeEmail("J.o.e+kalm@gmail.com")).toBe("joe@gmail.com");
    expect(normalizeEmail("joe@googlemail.com")).toBe("joe@gmail.com");
  });
});

describe("assertGuardianEmailAllowed", () => {
  it("rejects the account's own address and its Gmail aliases", () => {
    expect(() => assertGuardianEmailAllowed("teen@gmail.com", "teen@gmail.com")).toThrow(
      UserInputError,
    );
    expect(() => assertGuardianEmailAllowed("t.e.e.n+parent@gmail.com", "teen@gmail.com")).toThrow(
      UserInputError,
    );
    expect(() => assertGuardianEmailAllowed("teen+p@example.com", "TEEN@example.com")).toThrow(
      UserInputError,
    );
  });

  it("allows a different person, and a missing account email", () => {
    expect(() => assertGuardianEmailAllowed("mum@gmail.com", "teen@gmail.com")).not.toThrow();
    expect(() => assertGuardianEmailAllowed("mum@gmail.com", null)).not.toThrow();
  });
});
