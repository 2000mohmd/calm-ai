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

describe("thought work (CBT) guidance", () => {
  const p = buildSystemPrompt(base);

  it("has the section, offer-first entry and six steps", () => {
    for (const s of ["THOUGHT WORK (", "OFFER once", "Never open a questionnaire", "automatic thought", "evidence for, then against", "alternative explanations", "worst, likely outcome", "rigid rule", "balanced thought", "tiny experiment"])
      expect(p).toContain(s);
  });

  it("enforces one question plus value per message and the exit", () => {
    for (const s of ["ONE question per message", "never a bare question", "never repeat the offer", "stop asking", "just tell me", "0-100"])
      expect(p).toContain(s);
    expect(buildSystemPrompt({ ...base, history: [{ sender: "assistant", content: "Ready?" }] })).toContain("do NOT ask a question this turn");
  });

  it("merges safety without loosening existing rules", () => {
    for (const s of ["stop coaching and thought work", "crushing chest pain", "urgent medical help", "human professional", "NOT a safety situation", "SAFETY:", "ACUTE PANIC OR FEAR", "Never mention plans, payment"])
      expect(p).toContain(s);
  });

  it("keeps Levantine and does not include imaginal exposure", () => {
    expect(p).toContain("Levantine Arabic stays Levantine");
    expect(p).toContain("'وش'");
    expect(p).not.toMatch(/imaginal|close your eyes|imagine (that )?you/i);
    expect(p).toContain("Never walk them through feared or painful scenes");
  });

  it("limits the exercise widget", () => {
    for (const s of ["At most once per conversation", "never the same exercise twice", "never during panic", "real written reply"])
      expect(p).toContain(s);
  });
});
