import { ApiError } from "../../utils/http";
import type { AuthContext } from "../auth";
import type { Database, StatusColor } from "../../types/database";

export type PatientStatusRow = Database["public"]["Tables"]["patient_statuses"]["Row"];

// Postgres error codes raised by the constraints and functions in the
// custom-statuses migration, mapped to HTTP statuses.
function toApiError(error: { code?: string; message: string }): ApiError {
  switch (error.code) {
    case "23505":
      return new ApiError(409, "A status with this name already exists");
    case "42501":
      return new ApiError(403, error.message);
    case "P0002":
      return new ApiError(404, error.message);
    default:
      return new ApiError(400, error.message);
  }
}

// Live statuses in pipeline order, then archived ones (still needed to show
// their names in old status history).
export async function listStatuses(auth: AuthContext): Promise<PatientStatusRow[]> {
  const { data, error } = await auth.supabase
    .from("patient_statuses")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new ApiError(400, error.message);
  const rows = data ?? [];
  return [...rows.filter((s) => !s.archived_at), ...rows.filter((s) => s.archived_at)];
}

// Throws unless `key` is a live (not removed) status.
export async function assertLiveStatus(auth: AuthContext, key: string): Promise<PatientStatusRow> {
  const { data, error } = await auth.supabase
    .from("patient_statuses")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new ApiError(400, error.message);
  if (!data || data.archived_at) {
    throw new ApiError(400, "Invalid status value");
  }
  return data;
}

// "Follow-up call" -> "FOLLOW_UP_CALL". Keys are permanent, so a key taken
// by an archived status gets a numeric suffix rather than being reused.
function keyFromLabel(label: string): string {
  const base = label
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 50);
  return base || "STATUS";
}

export async function createStatus(
  auth: AuthContext,
  input: { label: string; color: StatusColor }
): Promise<PatientStatusRow> {
  const existing = await listStatuses(auth);
  const takenKeys = new Set(existing.map((s) => s.key));

  const base = keyFromLabel(input.label);
  let key = base;
  for (let n = 2; takenKeys.has(key); n++) {
    key = `${base}_${n}`;
  }

  const lastPosition = Math.max(0, ...existing.filter((s) => !s.archived_at).map((s) => s.position));

  const { data, error } = await auth.supabase
    .from("patient_statuses")
    .insert({ key, label: input.label, color: input.color, position: lastPosition + 1 })
    .select("*")
    .single();

  if (error) throw toApiError(error);
  return data;
}

export async function updateStatus(
  auth: AuthContext,
  key: string,
  input: { label?: string; color?: StatusColor }
): Promise<PatientStatusRow> {
  const { data, error } = await auth.supabase
    .from("patient_statuses")
    .update(input)
    .eq("key", key)
    .is("archived_at", null)
    .select("*")
    .maybeSingle();

  if (error) throw toApiError(error);
  if (!data) throw new ApiError(404, "Status not found");
  return data;
}

export async function reorderStatuses(auth: AuthContext, keys: string[]): Promise<void> {
  const { error } = await auth.supabase.rpc("reorder_patient_statuses", { p_keys: keys });
  if (error) throw toApiError(error);
}

// Moves the status's patients to `moveTo` (logged in their history), then
// deletes the status, or archives it if history still mentions it.
export async function removeStatus(
  auth: AuthContext,
  key: string,
  moveTo: string | null
): Promise<{ moved: number }> {
  const { data, error } = await auth.supabase.rpc("remove_patient_status", {
    p_key: key,
    p_move_to: moveTo,
  });
  if (error) throw toApiError(error);
  return { moved: data ?? 0 };
}
