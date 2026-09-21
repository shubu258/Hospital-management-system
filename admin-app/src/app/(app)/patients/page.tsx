import { apiFetch } from "@/lib/api";
import { PatientsClient } from "@/components/patients/PatientsClient";
import type { DirectoryEntry, PatientListResult, Profile } from "@/lib/types";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    assigned_to?: string;
    created_by?: string;
    page?: string;
    new?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.assigned_to) query.set("assigned_to", params.assigned_to);
  if (params.created_by) query.set("created_by", params.created_by);
  query.set("page", String(page));

  const [{ profile }, result, salesUsers, people] = await Promise.all([
    apiFetch<{ profile: Profile }>("/api/auth/me"),
    apiFetch<PatientListResult>(`/api/patients?${query.toString()}`),
    apiFetch<Pick<Profile, "id" | "name" | "email" | "role">[]>("/api/users"),
    apiFetch<DirectoryEntry[]>("/api/users/directory").catch(() => []),
  ]);

  return (
    <PatientsClient
      result={result}
      salesUsers={salesUsers}
      people={people}
      currentUserId={profile.id}
      searchValue={params.search ?? ""}
      statusValue={params.status ?? ""}
      assignedToValue={params.assigned_to ?? ""}
      createdByValue={params.created_by ?? ""}
      page={page}
      showSalesOwnerFilter
      allowAssignment
      canDelete
      defaultOpenNew={params.new === "1"}
    />
  );
}
