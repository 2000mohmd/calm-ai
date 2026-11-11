import { describe, expect, it } from "vitest";
import { safeEqual } from "./secure-compare";

describe("safeEqual", () => {
  it("is true only for identical strings", async () => {
    expect(await safeEqual("sweep-secret", "sweep-secret")).toBe(true);
    expect(await safeEqual("sweep-secret", "sweep-secreT")).toBe(false);
    expect(await safeEqual("sweep-secret", "sweep-secret ")).toBe(false);
    expect(await safeEqual("", "x")).toBe(false);
  });

  it("handles different lengths and non-ASCII without throwing", async () => {
    expect(await safeEqual("short", "a-much-longer-secret-value")).toBe(false);
    expect(await safeEqual("sécret-密码", "sécret-密码")).toBe(true);
    expect(await safeEqual("sécret-密码", "secret-密码")).toBe(false);
  });
});
