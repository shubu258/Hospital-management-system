import { notFound } from "next/navigation";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { PatientDetailClient } from "@/components/patients/PatientDetailClient";
import type { DirectoryEntry, Patient, PatientDocument, Profile, StatusHistoryEntry } from "@/lib/types";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { profile } = await apiFetch<{ profile: Profile }>("/api/auth/me");
  const isAdmin = profile.role === "ADMIN";

  let patient: Patient;
  let documents: PatientDocument[];
  let history: StatusHistoryEntry[];
  let salesUsers: Pick<Profile, "id" | "name" | "email" | "role">[];
  let people: DirectoryEntry[];

  try {
    [patient, documents, history, salesUsers, people] = await Promise.all([
      apiFetch<Patient>(`/api/patients/${id}`),
      apiFetch<PatientDocument[]>(`/api/patients/${id}/documents`),
      apiFetch<StatusHistoryEntry[]>(`/api/patients/${id}/status-history`),
      isAdmin
        ? apiFetch<Pick<Profile, "id" | "name" | "email" | "role">[]>("/api/users")
        : Promise.resolve([
            { id: profile.id, name: profile.name, email: profile.email, role: profile.role },
          ]),
      apiFetch<DirectoryEntry[]>("/api/users/directory").catch(() => []),
    ]);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <PatientDetailClient
      patient={patient}
      documents={documents}
      history={history}
      salesUsers={salesUsers}
      people={people}
      allowAssignment={isAdmin}
      canDelete={isAdmin}
    />
  );
}
