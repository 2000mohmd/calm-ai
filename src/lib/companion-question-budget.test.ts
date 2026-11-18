import { describe, expect, it } from "vitest";
import { buildSystemPrompt, endsWithQuestion, type CompanionContext } from "./ai-companion.server";

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
