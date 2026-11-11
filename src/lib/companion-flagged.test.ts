// When the crisis gate flags a message the companion must lead with care and
// must not be able to turn the moment into a coaching task.
import { describe, expect, it } from "vitest";
import { buildSystemPrompt, type CompanionContext } from "./ai-companion.server";
import { CHAT_TOOLS, chatToolsFor } from "./companion-tools.server";

const base: CompanionContext = {
  preferredName: "Sam",
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

const names = (tools: { name: string }[]) => tools.map((tool) => tool.name);

describe("chatToolsFor", () => {
  it("is the full set for an ordinary message", () => {
    expect(chatToolsFor({})).toBe(CHAT_TOOLS);
    expect(chatToolsFor({ crisisFlagged: false })).toBe(CHAT_TOOLS);
  });

  it("withholds coaching-task tools for a flagged message", () => {
    const flagged = names(chatToolsFor({ crisisFlagged: true }));
    for (const tool of [
      "create_commitment",
      "complete_commitment",
      "launch_exercise",
      "show_exercise_widget",
      "complete_exercise_in_chat",
      "get_screener_questions",
      "submit_screener_in_chat",
    ]) {
      expect(flagged).not.toContain(tool);
    }
  });

  it("still lets the companion bring in a human or point to support", () => {
    const flagged = names(chatToolsFor({ crisisFlagged: true }));
    expect(flagged).toContain("request_human_support");
    expect(flagged).toContain("suggest_stepup");
  });
});

describe("buildSystemPrompt", () => {
  it("adds the safety instruction only when the message was flagged", () => {
    expect(buildSystemPrompt(base)).not.toMatch(/SAFETY FLAG/);
    const flagged = buildSystemPrompt({ ...base, crisisFlagged: true });
    expect(flagged).toMatch(/SAFETY FLAG/);
    expect(flagged).toMatch(/whether they are safe right now/i);
  });
});
