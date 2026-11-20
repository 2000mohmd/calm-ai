import { describe, expect, it } from "vitest";
import { buildSystemPrompt, endsWithQuestion, SYSTEM_DYNAMIC_MARKER, type CompanionContext } from "./ai-companion.server";

const base: CompanionContext = {
  preferredName: null,
  accountType: "general",
  introText: null,
  goals: [],
  stressors: [],
  communicationPreference: null,
  topicsToAvoid: null,
  inProfessionalCare: false,
  recentMoods: [],
  history: [],
  quickAction: null,
};
const LINE = "do NOT ask a question this turn";

describe("question budget", () => {
  it("detects trailing questions", () => {
    expect(endsWithQuestion("How are you?")).toBe(true);
    expect(endsWithQuestion("كيف حالك؟ ")).toBe(true);
    expect(endsWithQuestion("Breathe out slowly.")).toBe(false);
    expect(endsWithQuestion(null)).toBe(false);
  });

  it("adds the per-turn line only after an assistant question", () => {
    const h = (sender: string, content: string) => ({ ...base, history: [{ sender, content }] });
    expect(buildSystemPrompt(h("assistant", "What happened?"))).toContain(LINE);
    expect(buildSystemPrompt(h("assistant", "Rest a bit."))).not.toContain(LINE);
    expect(buildSystemPrompt(h("user", "why?"))).not.toContain(LINE);
  });
});

describe("cacheable prefix", () => {
  it("static part is identical across users and turns, dynamic part follows the marker", () => {
    const a = buildSystemPrompt({ ...base, preferredName: "Sam", crisisFlagged: true, history: [{ sender: "assistant", content: "Why?" }] });
    const b = buildSystemPrompt({ ...base, goals: ["sleep"], quickAction: "vent" });
    expect(a.split(SYSTEM_DYNAMIC_MARKER)).toHaveLength(2);
    expect(a.split(SYSTEM_DYNAMIC_MARKER)[0]).toBe(b.split(SYSTEM_DYNAMIC_MARKER)[0]);
    const dyn = a.split(SYSTEM_DYNAMIC_MARKER)[1];
    expect(dyn).toContain("SAFETY FLAG");
    expect(dyn).toContain("do NOT ask a question this turn");
    expect(dyn).toContain("Sam");
  });
});
