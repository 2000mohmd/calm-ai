import { UserInputError } from "./user-input-error";

/**
 * Canonical form for comparing mailbox identity: lowercase, `+tag` stripped on
 * every domain, and for Gmail also dots removed (and googlemail.com == gmail.com).
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 0) return trimmed;
  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    domain = "gmail.com";
    local = local.replaceAll(".", "");
  }
  return `${local}@${domain}`;
}

/**
 * A teen's parent/guardian must be someone else: if they could enter their own
 * address they could approve their own consent. (We can't verify the person
 * behind an address, but this closes the obvious shortcut, including Gmail
 * dot/plus aliases of the account's own address.)
 */
export function assertGuardianEmailAllowed(
  guardianEmail: string,
  accountEmail: string | null | undefined,
): void {
  if (accountEmail && normalizeEmail(guardianEmail) === normalizeEmail(accountEmail)) {
    throw new UserInputError("Please use your parent or guardian's email address, not your own.");
  }
}
