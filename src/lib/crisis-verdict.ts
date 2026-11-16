// Pure parsing of the semantic crisis classifier's reply. Kept free of server
// imports so it can be unit-tested directly.
import type { CrisisSeverity } from "./crisis";

export type SemanticCrisisResult = {
  flagged: boolean;
  severity: CrisisSeverity | null;
  reason: string | null;
  /**
   * True when the classifier itself errored (or returned unparseable output) and
   * we returned "not flagged" without an actual verdict. The crisis gate uses
   * this to fail SAFE for non-English messages, where the regex tier is weaker.
   */
  failedOpen?: boolean;
};

export const NOT_FLAGGED: SemanticCrisisResult = { flagged: false, severity: null, reason: null };

export const CLASSIFIER_ERROR: SemanticCrisisResult = {
  flagged: false,
  severity: null,
  reason: "classifier_unavailable",
  failedOpen: true,
};

const VERDICT_RE = /(?:^|\n)\s*(yes|no)\b|\b(yes|no)\s*\|/i;

/**
 * Expected: `yes | <tier> — <reason>` or `no | none — <reason>`. Tolerates code
 * fences and leading/trailing chatter. Output with no recognisable verdict is
 * treated as a classifier failure (failedOpen), never as "safe".
 */
export function parseVerdict(text: string): SemanticCrisisResult {
  const cleaned = text.replace(/```[a-z]*/gi, "").trim();
  const match = VERDICT_RE.exec(cleaned);
  const verdict = (match?.[1] ?? match?.[2])?.toLowerCase();
  if (!match || !verdict) return { ...CLASSIFIER_ERROR };
  if (verdict === "no") return { ...NOT_FLAGGED };

  const rest = cleaned.slice(match.index + match[0].length);
  const tier = rest.match(/\b(critical|high|moderate)\b/i)?.[1]?.toLowerCase() as
    CrisisSeverity | undefined;
  const reason =
    rest
      .replace(/^\s*[|]?\s*(critical|high|moderate|none)?\s*[—\-:]*\s*/i, "")
      .split("\n")[0]
      ?.trim() || null;

  return { flagged: true, severity: tier ?? "high", reason };
}
