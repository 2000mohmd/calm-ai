// The one place that decides who is staff. Roles live in the database
// (has_role RPC over user_roles) and are always checked server-side from the
// caller's verified user id, before any elevated (service-role) access.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

async function hasRole(supabase: Client, userId: string, role: "admin" | "super_admin") {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
  // A failed lookup is never treated as "allowed".
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Admins and super-admins. Throws "Forbidden" for anyone else. */
export async function assertAdmin(supabase: Client, userId: string): Promise<void> {
  const [admin, superAdmin] = await Promise.all([
    hasRole(supabase, userId, "admin"),
    hasRole(supabase, userId, "super_admin"),
  ]);
  if (!admin && !superAdmin) throw new Error("Forbidden");
}

/**
 * Role management is a strictly higher privilege than day-to-day admin work: an
 * admin must not be able to grant themselves (or anyone) admin access.
 */
export async function assertSuperAdmin(supabase: Client, userId: string): Promise<void> {
  if (!(await hasRole(supabase, userId, "super_admin"))) throw new Error("Forbidden");
}
