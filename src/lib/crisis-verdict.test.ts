import { describe, expect, it } from "vitest";
import { parseVerdict } from "./crisis-verdict";

describe("parseVerdict", () => {
  it("parses a flagged verdict with tier and reason", () => {
    expect(parseVerdict("yes | critical — mentions a plan")).toEqual({
      flagged: true,
      severity: "critical",
      reason: "mentions a plan",
    });
  });

  it("parses a negative verdict", () => {
    expect(parseVerdict("no | none — ordinary sadness")).toEqual({
      flagged: false,
      severity: null,
      reason: null,
    });
  });

  it("tolerates code fences", () => {
    const result = parseVerdict("```\nyes | moderate — passive ideation\n```");
    expect(result.flagged).toBe(true);
    expect(result.severity).toBe("moderate");
    expect(result.reason).toBe("passive ideation");
  });

  it("tolerates extra leading text", () => {
    const result = parseVerdict("Here is my answer:\nYes | high — clear intent");
    expect(result.flagged).toBe(true);
    expect(result.severity).toBe("high");
  });

  it("defaults a tierless yes to high", () => {
    expect(parseVerdict("yes").severity).toBe("high");
  });

  it("treats unparseable output as failedOpen, not safe", () => {
    for (const text of ["", "   ", "I cannot help with that.", "{}"]) {
      const result = parseVerdict(text);
      expect(result.flagged).toBe(false);
      expect(result.failedOpen).toBe(true);
    }
  });
});
