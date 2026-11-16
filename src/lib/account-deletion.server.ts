// Full account deletion (item 5) — shared by every place a person can delete
// their account, so they behave identically. Currently: the web settings page
// (deleteMyAccount in onboarding.functions.ts) and the mobile
// DELETE /api/v1/account route. Distinct from deleteMyData, which only wipes
// wellness data and keeps the account.
//
// Steps, in order:
//   1. delete_account(uuid) RPC — explicit erasure of the tables with no FK
//      to auth.users, and anonymizes crisis_events (user_id -> null; the row
//      survives, per docs/DATA_RETENTION.md).
//   2. auth.admin.deleteUser — deletes the auth user, cascading every
//      FK-linked table (see migration 20260902000300_delete_account.sql).
//
// Both callers pass the service-role (admin) client — RLS would block a user
// from either the RPC or auth.admin.deleteUser.
import type { SupabaseClient } from "@supabase/supabase-js";

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
};

/**
 * Destructive actions must not rest on JWT claims alone (getClaims can verify
 * locally, so a revoked/signed-out session would still pass). A live getUser()
 * round trip to Auth confirms the session still exists and is this user's.
 */
export async function assertLiveSession(
  supabase: {
    auth: {
      getUser: () => Promise<{ data: { user: { id: string } | null } | null; error: unknown }>;
    };
  },
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("Please sign in again to confirm this action.");
  }
  if (data.user.id !== userId) {
    throw new Error("Session mismatch. Please sign in again and retry.");
  }
}

export async function deleteAccountCore(
  // Untyped SupabaseClient (generic defaults to `any`) rather than
  // SupabaseClient<Database>: delete_account is added by a migration not in
  // the generated Database types.
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<void> {
  const rpcClient = supabaseAdmin as unknown as RpcClient;
  const { error: rpcError } = await rpcClient.rpc("delete_account", { p_user_id: userId });
  if (rpcError) throw new Error(rpcError.message);

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) throw authError;
}
