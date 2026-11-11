/**
 * An error whose message is safe and useful to show the person: a problem with
 * what they submitted (not a bug). The REST API maps it to a 400 with the
 * message; server functions pass the message through as they always did.
 */
export class UserInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserInputError";
  }
}
