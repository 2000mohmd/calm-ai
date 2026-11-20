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
  const p = buildSystemPrompt(base);

  it("covers panic, worry spirals and social anxiety, and keeps safety rules", () => {
    for (const s of ["ACUTE PANIC OR FEAR", "OTHER ANXIETY", "worry window", "Social anxiety", "Never repeat a technique", "never breath-holds"])
      expect(p).toContain(s);
    expect(p).toContain("SAFETY:");
    expect(p).toContain("emergency services");
  });

  it("makes panic replies short but warm, never minimizing", () => {
    for (const s of ["short but warm and human", "2-4 short sentences", "reflect their fear in their own words", "never minimize", "it's just a thought", "ONE concrete step", "superstitious", "the fear is real"])
      expect(p).toContain(s);
    expect(p).not.toContain("35 words");
  });
});
