import { describe, expect, it } from "vitest";
import { deleteAccountCore } from "./account-deletion.server";

function fakeAdmin(opts: { rpcError?: string | null; deleteUserError?: Error | null }) {
  const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  const deleteUserCalls: string[] = [];

  return {
    client: {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        rpcCalls.push({ fn, args });
        return { error: opts.rpcError ? { message: opts.rpcError } : null };
      },
      auth: {
        admin: {
          deleteUser: async (userId: string) => {
            deleteUserCalls.push(userId);
            return { error: opts.deleteUserError ?? null };
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub, shape matched to what deleteAccountCore actually calls
    } as any,
    rpcCalls,
    deleteUserCalls,
  };
}

describe("deleteAccountCore", () => {
  it("runs the RPC, then deletes the auth user", async () => {
    const { client, rpcCalls, deleteUserCalls } = fakeAdmin({});

    await deleteAccountCore(client, "user-1");

    expect(rpcCalls).toEqual([{ fn: "delete_account", args: { p_user_id: "user-1" } }]);
    expect(deleteUserCalls).toEqual(["user-1"]);
  });

  it("throws and never deletes the auth user if the delete_account RPC fails", async () => {
    const { client, deleteUserCalls } = fakeAdmin({ rpcError: "boom" });

    await expect(deleteAccountCore(client, "user-4")).rejects.toThrow(/boom/);
    expect(deleteUserCalls).toEqual([]);
  });

  it("propagates an auth.admin.deleteUser error", async () => {
    const { client } = fakeAdmin({ deleteUserError: new Error("delete failed") });

    await expect(deleteAccountCore(client, "user-5")).rejects.toThrow(/delete failed/);
  });
});
