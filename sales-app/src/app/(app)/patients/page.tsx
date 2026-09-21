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

  const { profile } = await apiFetch<{ profile: Profile }>("/api/auth/me");
  const isAdmin = profile.role === "ADMIN";

  const [result, salesUsers, people] = await Promise.all([
    apiFetch<PatientListResult>(`/api/patients?${query.toString()}`),
    isAdmin
      ? apiFetch<Pick<Profile, "id" | "name" | "email" | "role">[]>("/api/users")
      : Promise.resolve([{ id: profile.id, name: profile.name, email: profile.email, role: profile.role }]),
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
      showSalesOwnerFilter={isAdmin}
      allowAssignment={isAdmin}
      canDelete={isAdmin}
      defaultOpenNew={params.new === "1"}
    />
  );
}
