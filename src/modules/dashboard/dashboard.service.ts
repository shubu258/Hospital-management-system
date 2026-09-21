import { ApiError } from "../../utils/http";
import { PATIENT_STATUSES } from "../../types/database";
import type { AuthContext } from "../auth";
import type { PatientStatus } from "../../types/database";

function emptyStatusCounts(): Record<PatientStatus, number> {
  const counts = {} as Record<PatientStatus, number>;
  for (const status of PATIENT_STATUSES) {
    counts[status] = 0;
  }
  return counts;
}

export async function getAdminDashboard(auth: AuthContext) {
  const { data: patients, error } = await auth.supabase
    .from("patients")
    .select("status, assigned_to, created_by");

  if (error) throw new ApiError(400, error.message);

  const rows = patients ?? [];
  const statusCounts = emptyStatusCounts();
  const countsByUser = new Map<string | null, number>();
  const statusCountsByUser = new Map<string | null, Record<PatientStatus, number>>();
  const countsByCreator = new Map<string | null, number>();

  for (const row of rows) {
    statusCounts[row.status] += 1;
    countsByUser.set(row.assigned_to, (countsByUser.get(row.assigned_to) ?? 0) + 1);
    countsByCreator.set(row.created_by, (countsByCreator.get(row.created_by) ?? 0) + 1);

    const userStatusCounts = statusCountsByUser.get(row.assigned_to) ?? emptyStatusCounts();
    userStatusCounts[row.status] += 1;
    statusCountsByUser.set(row.assigned_to, userStatusCounts);
  }

  const relevantIds = new Set<string>();
  for (const id of countsByUser.keys()) if (id) relevantIds.add(id);
  for (const id of countsByCreator.keys()) if (id) relevantIds.add(id);
  const namesById = new Map<string, string>();

  if (relevantIds.size > 0) {
    const { data: profiles, error: profilesError } = await auth.supabase
      .from("profiles")
      .select("id, name")
      .in("id", [...relevantIds]);

    if (profilesError) throw new ApiError(400, profilesError.message);
    for (const profile of profiles ?? []) {
      namesById.set(profile.id, profile.name);
    }
  }

  const byUser = [...countsByUser.entries()].map(([userId, count]) => ({
    userId,
    name: userId ? namesById.get(userId) ?? "Unknown" : "Unassigned",
    count,
    statusCounts: statusCountsByUser.get(userId) ?? emptyStatusCounts(),
  }));

  // Who actually added each patient — distinct from byUser (current
  // ownership), which shifts whenever an admin reassigns a patient.
  const addedByUser = [...countsByCreator.entries()]
    .filter((entry): entry is [string, number] => entry[0] !== null)
    .map(([userId, count]) => ({
      userId,
      name: namesById.get(userId) ?? "Unknown",
      count,
    }));

  return {
    totalPatients: rows.length,
    statusCounts,
    byUser,
    addedByUser,
  };
}

const ANALYTICS_WEEKS = 8;

// Monday (UTC) of the week containing `date`, at midnight.
function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return d;
}

function weekKey(date: Date): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

export interface SalesAnalytics {
  weeks: string[];
  newPatients: number[];
  activePatients: number[];
  closedPatients: number[];
}

export async function getSalesAnalytics(auth: AuthContext): Promise<SalesAnalytics> {
  const rangeStart = startOfWeek(new Date());
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 7 * (ANALYTICS_WEEKS - 1));

  const weeks: string[] = [];
  for (let i = 0; i < ANALYTICS_WEEKS; i++) {
    const d = new Date(rangeStart);
    d.setUTCDate(d.getUTCDate() + i * 7);
    weeks.push(weekKey(d));
  }

  const [{ data: patients, error: patientsError }, { data: history, error: historyError }] =
    await Promise.all([
      auth.supabase
        .from("patients")
        .select("created_at")
        .gte("created_at", rangeStart.toISOString()),
      auth.supabase
        .from("patient_status_history")
        .select("new_status, created_at")
        .in("new_status", ["ACTIVE", "CLOSED"])
        .gte("created_at", rangeStart.toISOString()),
    ]);

  if (patientsError) throw new ApiError(400, patientsError.message);
  if (historyError) throw new ApiError(400, historyError.message);

  const newPatients = new Map(weeks.map((w) => [w, 0]));
  const activePatients = new Map(weeks.map((w) => [w, 0]));
  const closedPatients = new Map(weeks.map((w) => [w, 0]));

  for (const patient of patients ?? []) {
    const key = weekKey(new Date(patient.created_at));
    if (newPatients.has(key)) newPatients.set(key, (newPatients.get(key) ?? 0) + 1);
  }

  for (const entry of history ?? []) {
    const key = weekKey(new Date(entry.created_at));
    const bucket = entry.new_status === "ACTIVE" ? activePatients : closedPatients;
    if (bucket.has(key)) bucket.set(key, (bucket.get(key) ?? 0) + 1);
  }

  return {
    weeks,
    newPatients: weeks.map((w) => newPatients.get(w) ?? 0),
    activePatients: weeks.map((w) => activePatients.get(w) ?? 0),
    closedPatients: weeks.map((w) => closedPatients.get(w) ?? 0),
  };
}

export async function getMyDashboard(auth: AuthContext) {
  const { data: patients, error } = await auth.supabase
    .from("patients")
    .select("status")
    .eq("assigned_to", auth.userId);

  if (error) throw new ApiError(400, error.message);

  const rows = patients ?? [];
  const statusCounts = emptyStatusCounts();
  for (const row of rows) {
    statusCounts[row.status] += 1;
  }

  return {
    totalPatients: rows.length,
    statusCounts,
  };
}
