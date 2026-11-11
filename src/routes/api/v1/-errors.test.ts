// How the REST API turns thrown errors into HTTP responses.
import { describe, expect, it } from "vitest";
import { COACH_PAID_ONLY } from "@/lib/human-handoff.functions";
import { TooManyRequestsError, UserInputError } from "@/lib/user-input-error";
import { ApiError, handle } from "./-shared";

const respond = async (error: unknown) => {
  const response = await handle(async () => {
    throw error;
  });
  return { status: response.status, body: (await response.json()) as { error: string } };
};

describe("handle()", () => {
  it("a person's bad input is a 400 that keeps its message", async () => {
    expect(await respond(new UserInputError("Use your parent's email"))).toEqual({
      status: 400,
      body: { error: "Use your parent's email" },
    });
  });

  it("too many requests is a 429", async () => {
    const { status, body } = await respond(new TooManyRequestsError());
    expect(status).toBe(429);
    expect(body.error).toMatch(/too many requests/i);
  });

  it("the paid-coach rule is a 402", async () => {
    expect((await respond(new Error(COACH_PAID_ONLY))).status).toBe(402);
  });

  it("ApiError keeps its own status", async () => {
    expect((await respond(new ApiError(403, "Forbidden"))).status).toBe(403);
  });

  it("an unexpected error is a generic 500 that leaks nothing", async () => {
    const { status, body } = await respond(new Error("connection string postgres://secret"));
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Internal error" });
  });
});
