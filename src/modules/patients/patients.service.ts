import { ApiError } from "../../utils/http";
import { escapeLikePattern } from "../../utils/validation";
import { PATIENT_DOCUMENTS_BUCKET } from "../documents/documents.constants";
import { assertLiveStatus } from "../statuses";
import type { AuthContext } from "../auth";
import type { Database, PatientStatus } from "../../types/database";
import type { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from "./patients.types";

type Patient = Database["public"]["Tables"]["patients"]["Row"];
type StatusHistoryEntry = Database["public"]["Tables"]["patient_status_history"]["Row"];

async function assertSalesUser(auth: AuthContext, userId: string): Promise<void> {
  const { data, error } = await auth.supabase
    .from("profiles")
    .select("id, role, removed_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  if (!data || data.role !== "SALES_USER" || data.removed_at) {
    throw new ApiError(400, "assigned_to must reference an existing sales user");
  }
}

export async function createPatient(
  auth: AuthContext,
  input: CreatePatientInput
): Promise<Patient> {
  let assignedTo: string | null;

  if (auth.profile.role === "SALES_USER") {
    assignedTo = auth.userId;
  } else {
    assignedTo = input.assigned_to ?? null;
    if (assignedTo) {
      await assertSalesUser(auth, assignedTo);
    }
  }

  const { data, error } = await auth.supabase
    .from("patients")
    .insert({
      name: input.name,
      country: input.country,
      phone: input.phone ?? null,
      email: input.email ?? null,
      medical_condition: input.medical_condition ?? null,
      medical_description: input.medical_description ?? null,
      assigned_to: assignedTo,
    })
    .select("*")
    .single();

  if (error) throw new ApiError(400, error.message);
  return data;
}

export async function listPatients(auth: AuthContext, query: ListPatientsQuery) {
  let builder = auth.supabase.from("patients").select("*", { count: "exact" });

  if (query.search) {
    builder = builder.ilike("name", `%${escapeLikePattern(query.search)}%`);
  }
  if (query.status) {
    builder = builder.eq("status", query.status);
  }
  if (query.assignedTo) {
    builder = builder.eq("assigned_to", query.assignedTo);
  }
  if (query.createdBy) {
    builder = builder.eq("created_by", query.createdBy);
  }

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  const { data, error, count } = await builder
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new ApiError(400, error.message);

  return {
    patients: data ?? [],
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: count ?? 0,
    },
  };
}

export async function getPatientById(auth: AuthContext, id: string): Promise<Patient> {
  const { data, error } = await auth.supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ApiError(400, error.message);
  if (!data) throw new ApiError(404, "Patient not found");
  return data;
}

export async function updatePatient(
  auth: AuthContext,
  id: string,
  input: UpdatePatientInput
): Promise<Patient> {
  const { data, error } = await auth.supabase
    .from("patients")
    .update(input)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new ApiError(400, error.message);
  if (!data) throw new ApiError(404, "Patient not found");
  return data;
}

export async function updatePatientStatus(
  auth: AuthContext,
  id: string,
  newStatus: PatientStatus
): Promise<{ patient: Patient; historyEntry: StatusHistoryEntry }> {
  const current = await getPatientById(auth, id);

  if (current.status === newStatus) {
    throw new ApiError(400, "Patient is already in this status");
  }
  await assertLiveStatus(auth, newStatus);

  const { data: patient, error: updateError } = await auth.supabase
    .from("patients")
    .update({ status: newStatus })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (updateError) throw new ApiError(400, updateError.message);
  if (!patient) throw new ApiError(404, "Patient not found");

  const { data: historyEntry, error: historyError } = await auth.supabase
    .from("patient_status_history")
    .insert({
      patient_id: id,
      old_status: current.status,
      new_status: newStatus,
      changed_by: auth.userId,
    })
    .select("*")
    .single();

  if (historyError) throw new ApiError(400, historyError.message);

  return { patient, historyEntry };
}

export async function getStatusHistory(
  auth: AuthContext,
  id: string
): Promise<StatusHistoryEntry[]> {
  await getPatientById(auth, id);

  const { data, error } = await auth.supabase
    .from("patient_status_history")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: true });

  if (error) throw new ApiError(400, error.message);
  return data ?? [];
}

export async function deletePatient(auth: AuthContext, id: string): Promise<void> {
  await getPatientById(auth, id);

  const { data: documents, error: documentsError } = await auth.supabase
    .from("patient_documents")
    .select("file_path")
    .eq("patient_id", id);

  if (documentsError) throw new ApiError(400, documentsError.message);

  if (documents && documents.length > 0) {
    const { error: storageError } = await auth.supabase.storage
      .from(PATIENT_DOCUMENTS_BUCKET)
      .remove(documents.map((doc) => doc.file_path));

    if (storageError) throw new ApiError(400, storageError.message);
  }

  // Cascades to patient_documents and patient_status_history via their FKs.
  const { error } = await auth.supabase.from("patients").delete().eq("id", id);
  if (error) throw new ApiError(400, error.message);
}

export async function deleteStatusHistoryEntry(
  auth: AuthContext,
  patientId: string,
  historyId: string
): Promise<void> {
  await getPatientById(auth, patientId);

  const { data, error } = await auth.supabase
    .from("patient_status_history")
    .delete()
    .eq("id", historyId)
    .eq("patient_id", patientId)
    .select("id")
    .maybeSingle();

  if (error) throw new ApiError(400, error.message);
  if (!data) throw new ApiError(404, "Status history entry not found");
}

// Reassigns every patient currently in `status` to `assignedTo` in one shot —
// for a team that splits ownership by pipeline stage (one person handles
// every NEW lead, another handles everything ACTIVE, etc.) rather than one
// rep owning a lead end-to-end.
export async function bulkAssignByStatus(
  auth: AuthContext,
  status: PatientStatus,
  assignedTo: string
): Promise<{ updated: number }> {
  await assertSalesUser(auth, assignedTo);
  await assertLiveStatus(auth, status);

  const { data, error } = await auth.supabase
    .from("patients")
    .update({ assigned_to: assignedTo })
    .eq("status", status)
    .select("id");

  if (error) throw new ApiError(400, error.message);
  return { updated: data?.length ?? 0 };
}

export async function assignPatient(
  auth: AuthContext,
  id: string,
  assignedTo: string
): Promise<Patient> {
  await assertSalesUser(auth, assignedTo);

  const { data, error } = await auth.supabase
    .from("patients")
    .update({ assigned_to: assignedTo })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new ApiError(400, error.message);
  if (!data) throw new ApiError(404, "Patient not found");
  return data;
}
