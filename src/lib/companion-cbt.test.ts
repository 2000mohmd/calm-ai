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
    for (const s of ["THOUGHT WORK (", "OFFER once", "never open a questionnaire", "CLARIFY", "EVIDENCE", "ALTERNATIVES", "OUTCOMES", "RULES AND MEANING", "BALANCED THOUGHT", "tiny behavioural experiment"])
      expect(p).toContain(s);
  });

  it("enforces one question plus value per message and the exit", () => {
    for (const s of ["at most ONE question per message", "never a bare question", "6-sentence cap", "previous message ended with a question", "stop asking", "just tell me", "0-100"])
      expect(p).toContain(s);
  });

  it("merges safety without loosening existing rules", () => {
    for (const s of ["THOUGHT WORK SAFETY", "stop thought work entirely", "crushing chest pain", "urgent medical help", "human professional", "NOT a safety situation", "SELF-HARM AND DANGER", "PANIC ("])
      expect(p).toContain(s);
  });

  it("keeps Levantine and does not include imaginal exposure", () => {
    expect(p).toContain("Levantine Arabic stays Levantine");
    expect(p).toContain("'وش'");
    expect(p).not.toMatch(/imaginal|close your eyes|imagine (that )?you/i);
  });
});
