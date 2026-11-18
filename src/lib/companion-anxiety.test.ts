import { describe, expect, it } from "vitest";
import { buildSystemPrompt, type CompanionContext } from "./ai-companion.server";

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

describe("anxiety guidance", () => {
  it("is in the prompt with panic, worry and social rules, and keeps safety rules", () => {
    const p = buildSystemPrompt(base);
    for (const s of ["ANXIETY (", "PANIC (", "WORRY SPIRALS", "SOCIAL ANXIETY", "NEVER repeat a technique", "never breath-holds"])
      expect(p).toContain(s);
    expect(p).toContain("SELF-HARM AND DANGER");
    expect(p).toContain("emergency services");
  });
});
