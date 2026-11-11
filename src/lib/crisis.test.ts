// The deterministic crisis matcher: what it must catch (including formatting
// tricks and phrasings that used to slip through) and what it must leave alone.
import { describe, expect, it } from "vitest";
import { normalizeForMatching, triageCrisis, type CrisisSeverity } from "./crisis";

const severityOf = (text: string): CrisisSeverity | null => triageCrisis(text).severity;

describe("triageCrisis: critical (plan, method, intent)", () => {
  it.each([
    "I am going to kill myself",
    "I will kill myself",
    "I'll kill myself",
    "I'm going to kill myself",
    "I’m going to kill myself", // curly apostrophe (iOS)
    "I've decided to end it",
    "I want to slit my wrists",
    "I'm going to shoot myself",
    "I keep thinking about jumping off a bridge",
    "je vais me pendre",
    "me pendre",
  ])("%s", (text) => {
    expect(severityOf(text)).toBe("critical");
  });
});

describe("triageCrisis: high (clear ideation)", () => {
  it.each([
    "I want to kill myself",
    "I don’t want to live anymore", // curly apostrophe
    "i wanna die",
    "I want to be dead",
    "I want to unalive myself",
    "k1ll myself", // leetspeak
    "I am su1cidal",
    "s u i c i d e", // spaced letters
    "S​u​i​c​i​d​e", // zero-width characters
    "أبغى أموت", // Gulf Arabic: "I want to die"
    "ودي أموت",
    "بدي أموت",
    "أنتحـار", // tatweel
    "أَنتحر", // diacritics
    "je veux me foutre en l'air",
  ])("%s", (text) => {
    expect(severityOf(text)).toBe("high");
  });
});

describe("triageCrisis: moderate and none", () => {
  it("passive ideation is moderate", () => {
    expect(severityOf("I wish I could just disappear")).toBe("moderate");
  });

  it.each([
    "This deadline is killing me",
    "I'm exhausted after a long day",
    "I had a great day at work",
    "Can you help me plan my week?",
    "I feel anxious about my exam",
    "",
  ])("is not flagged: %s", (text) => {
    expect(severityOf(text)).toBeNull();
  });
});

describe("normalizeForMatching", () => {
  it("straightens apostrophes, strips zero-width marks and joins spaced letters", () => {
    expect(normalizeForMatching("don’t")).toBe("don't");
    expect(normalizeForMatching("a​b")).toBe("ab");
    expect(normalizeForMatching("k i l l")).toBe("kill");
  });

  it("removes Arabic diacritics and tatweel but keeps the letters", () => {
    expect(normalizeForMatching("أَنتحـر")).toBe("أنتحر");
  });

  it("leaves ordinary sentences alone", () => {
    expect(normalizeForMatching("I went to a b c store")).toBe("I went to a b c store");
  });
});
