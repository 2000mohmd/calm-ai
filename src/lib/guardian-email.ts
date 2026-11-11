import { UserInputError } from "./user-input-error";

/**
 * A teen's parent/guardian must be someone else: if they could enter their own
 * address they could approve their own consent. (We can't verify the person
 * behind an address, but this closes the obvious shortcut.)
 */
export function assertGuardianEmailAllowed(
  guardianEmail: string,
  accountEmail: string | null | undefined,
): void {
  if (accountEmail && guardianEmail.trim().toLowerCase() === accountEmail.trim().toLowerCase()) {
    throw new UserInputError("Please use your parent or guardian's email address, not your own.");
  }
}
