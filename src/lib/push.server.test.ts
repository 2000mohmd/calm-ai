// Push routing: Expo tokens (the mobile app) go through Expo's push service;
// raw FCM tokens only when FCM is configured; dead tokens are cleaned up.
import { afterEach, describe, expect, it, vi } from "vitest";
import { isExpoPushToken, sendPushToUser } from "./push.server";

function fakeSupabase(tokens: { id: string; token: string }[]) {
  const deleted: string[][] = [];
  const table = {
    select: () => ({ eq: async () => ({ data: tokens, error: null }) }),
    delete: () => ({
      in: async (_col: string, ids: string[]) => {
        deleted.push(ids);
        return { error: null };
      },
    }),
  };
  return { client: { from: () => table } as never, deleted };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("push routing", () => {
  it("recognises Expo push tokens", () => {
    expect(isExpoPushToken("ExponentPushToken[abc123]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abc123]")).toBe(true);
    expect(isExpoPushToken("dGhpcyBpcyBhbiBGQ00gdG9rZW4")).toBe(false);
  });

  it("sends Expo tokens via Expo even without FCM configured, and skips FCM tokens", async () => {
    vi.stubEnv("FCM_SERVICE_ACCOUNT_JSON", "");
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { status: "ok", id: "r1" } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { client, deleted } = fakeSupabase([
      { id: "t1", token: "ExponentPushToken[abc]" },
      { id: "t2", token: "raw-fcm-token" },
    ]);

    const result = await sendPushToUser(client, "user-1", { title: "Kalm", body: "Hi" });

    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://exp.host/--/api/v2/push/send");
    expect(JSON.parse(String(init.body))).toMatchObject({
      to: "ExponentPushToken[abc]",
      title: "Kalm",
      body: "Hi",
    });
    expect(deleted).toEqual([]);
  });

  it("removes a token Expo reports as DeviceNotRegistered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: { status: "error", details: { error: "DeviceNotRegistered" } },
            }),
            { status: 200 },
          ),
      ),
    );
    const { client, deleted } = fakeSupabase([{ id: "t1", token: "ExponentPushToken[gone]" }]);

    const result = await sendPushToUser(client, "user-1", { title: "Kalm", body: "Hi" });

    expect(result.sent).toBe(0);
    expect(deleted).toEqual([["t1"]]);
  });
});
