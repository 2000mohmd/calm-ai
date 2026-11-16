import { beforeEach, describe, expect, it } from "vitest";
import { burstAllowed, burstLimit, enforceBurst, resetBurstLimits } from "./burst-limit";
import { TooManyRequestsError } from "./user-input-error";

beforeEach(resetBurstLimits);

describe("burstLimit", () => {
  it("allows up to max calls in the window, then refuses", () => {
    const t = 1_000_000;
    expect([1, 2, 3].map(() => burstLimit("k", 3, 60_000, t))).toEqual([true, true, true]);
    expect(burstLimit("k", 3, 60_000, t + 1)).toBe(false);
  });

  it("frees up as old calls age out of the window", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i += 1) burstLimit("k", 3, 60_000, t);
    expect(burstLimit("k", 3, 60_000, t + 59_999)).toBe(false);
    expect(burstLimit("k", 3, 60_000, t + 60_001)).toBe(true);
  });

  it("keeps separate buckets per key", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i += 1) burstLimit("alice", 3, 60_000, t);
    expect(burstLimit("alice", 3, 60_000, t)).toBe(false);
    expect(burstLimit("bob", 3, 60_000, t)).toBe(true);
  });

  it("refused calls are not counted against the member", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i += 1) burstLimit("k", 3, 60_000, t);
    for (let i = 0; i < 10; i += 1) burstLimit("k", 3, 60_000, t + 1_000); // all refused
    // Once the first three age out, a new call is allowed straight away.
    expect(burstLimit("k", 3, 60_000, t + 60_001)).toBe(true);
  });
});

describe("enforceBurst", () => {
  it("throws TooManyRequestsError when over the limit", async () => {
    await enforceBurst("x", 1, 60_000);
    await expect(enforceBurst("x", 1, 60_000)).rejects.toThrow(TooManyRequestsError);
  });

  it("burstAllowed returns a boolean instead of throwing", async () => {
    expect(await burstAllowed("y", 1, 60_000)).toBe(true);
    expect(await burstAllowed("y", 1, 60_000)).toBe(false);
  });
});
