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

/** The person (or their client) is doing something too often. The REST API answers 429. */
export class TooManyRequestsError extends Error {
  constructor(message = "Too many requests. Please wait a moment and try again.") {
    super(message);
    this.name = "TooManyRequestsError";
  }
}
