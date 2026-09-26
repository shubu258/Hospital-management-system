import { supabaseAdmin } from "../../config/supabase";
import { ApiError } from "../../utils/http";
import type { AuthContext } from "../auth";
import type { Database } from "../../types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type SalesUserSummary = Pick<Profile, "id" | "name" | "email" | "role" | "created_at" | "removed_at">;
export type DirectoryEntry = { id: string; name: string };

// Long enough to be permanent; Supabase Auth has no "forever" ban.
const REMOVED_BAN_DURATION = "876000h"; // 100 years

// Any authenticated user can resolve a teammate's name (leads are shared
// across the whole team) without being able to read their email, role, or
// join date — those stay behind listSalesUsers, which is admin-only.
// Removed members stay in the directory so history still shows their names.
export async function listDirectory(auth: AuthContext): Promise<DirectoryEntry[]> {
  const { data, error } = await auth.supabase.rpc("team_directory");
  if (error) throw new ApiError(400, error.message);
  return data ?? [];
}

// Removed members are left out unless asked for, since this list also feeds
// the "assign to" pickers.
export async function listSalesUsers(
  auth: AuthContext,
  includeRemoved = false
): Promise<SalesUserSummary[]> {
  let builder = auth.supabase
    .from("profiles")
    .select("id, name, email, role, created_at, removed_at")
    .eq("role", "SALES_USER");

  if (!includeRemoved) {
    builder = builder.is("removed_at", null);
  }

  const { data, error } = await builder.order("name", { ascending: true });

  if (error) throw new ApiError(400, error.message);
  return data ?? [];
}

async function getSalesUser(auth: AuthContext, userId: string): Promise<SalesUserSummary> {
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, name, email, role, created_at, removed_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new ApiError(400, error.message);
  if (!data) throw new ApiError(404, "Team member not found");
  if (data.role !== "SALES_USER") {
    throw new ApiError(400, "Only sales users can be removed");
  }
  return data;
}

// Removes a sales user from the team:
//   - bans them in Supabase Auth, so neither password nor Google sign-in works
//   - keeps their auth account, so the email can't be registered again
//   - marks the profile removed, which requireAuth checks on every request,
//     so sessions they already have stop working immediately
//   - hands their patients to `reassignTo` (or leaves them unassigned)
export async function removeMember(
  auth: AuthContext,
  userId: string,
  reassignTo: string | null
): Promise<{ reassigned: number }> {
  const member = await getSalesUser(auth, userId);
  if (member.removed_at) {
    throw new ApiError(409, "This member has already been removed");
  }

  if (reassignTo) {
    if (reassignTo === userId) {
      throw new ApiError(400, "Choose someone else to take over their patients");
    }
    const target = await getSalesUser(auth, reassignTo).catch(() => null);
    if (!target || target.removed_at) {
      throw new ApiError(400, "Patients can only be reassigned to an active sales user");
    }
  }

  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: REMOVED_BAN_DURATION,
  });
  if (banError) throw new ApiError(400, banError.message);

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", userId);
  if (profileError) throw new ApiError(400, profileError.message);

  const { data: moved, error: reassignError } = await auth.supabase
    .from("patients")
    .update({ assigned_to: reassignTo })
    .eq("assigned_to", userId)
    .select("id");
  if (reassignError) throw new ApiError(400, reassignError.message);

  return { reassigned: moved?.length ?? 0 };
}

// Undoes removeMember's access changes. Patients that were reassigned stay
// where they are.
export async function restoreMember(auth: AuthContext, userId: string): Promise<void> {
  const member = await getSalesUser(auth, userId);
  if (!member.removed_at) {
    throw new ApiError(409, "This member hasn't been removed");
  }

  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (banError) throw new ApiError(400, banError.message);

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ removed_at: null })
    .eq("id", userId);
  if (profileError) throw new ApiError(400, profileError.message);
}
