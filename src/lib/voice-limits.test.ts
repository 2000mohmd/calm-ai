import { describe, expect, it } from "vitest";
import {
  MAX_CALL_SECONDS,
  capCallSeconds,
  dailyVoiceNoteCap,
  isCallStale,
  FREE_DAILY_VOICE_NOTE_CAP,
} from "./chat-limits";
import { estimateCallCostUsd } from "./rate-limit/pricing";

describe("voice limits", () => {
  it("caps duration at 15 minutes", () => {
    expect(MAX_CALL_SECONDS).toBe(900);
    expect(capCallSeconds(5000)).toBe(900);
    expect(capCallSeconds(-3)).toBe(0);
    expect(capCallSeconds(61.4)).toBe(61);
  });
  it("flags stale calls after 20 minutes", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(isCallStale("2026-01-01T11:39:00Z", now)).toBe(true);
    expect(isCallStale("2026-01-01T11:45:00Z", now)).toBe(false);
  });
  it("tiers voice notes", () => {
    expect(dailyVoiceNoteCap("free")).toBe(FREE_DAILY_VOICE_NOTE_CAP);
    expect(dailyVoiceNoteCap(null)).toBe(FREE_DAILY_VOICE_NOTE_CAP);
    expect(dailyVoiceNoteCap("pro")).toBe(300);
  });
  it("default cost is $0.15/min", () => {
    expect(estimateCallCostUsd(600)).toBeCloseTo(1.5);
  });
});
