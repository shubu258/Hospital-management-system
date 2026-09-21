import { ApiError } from "../../utils/http";
import type { AuthContext } from "../auth";
import type { Database } from "../../types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type SalesUserSummary = Pick<Profile, "id" | "name" | "email" | "role" | "created_at">;
export type DirectoryEntry = { id: string; name: string };

// Any authenticated user can resolve a teammate's name (leads are shared
// across the whole team) without being able to read their email, role, or
// join date — those stay behind listSalesUsers, which is admin-only.
export async function listDirectory(auth: AuthContext): Promise<DirectoryEntry[]> {
  const { data, error } = await auth.supabase.rpc("team_directory");
  if (error) throw new ApiError(400, error.message);
  return data ?? [];
}

export async function listSalesUsers(auth: AuthContext): Promise<SalesUserSummary[]> {
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, name, email, role, created_at")
    .eq("role", "SALES_USER")
    .order("name", { ascending: true });

  if (error) throw new ApiError(400, error.message);
  return data ?? [];
}
