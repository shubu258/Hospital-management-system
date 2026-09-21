"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { StageTracker } from "@/components/ui/StageTracker";
import { Timeline } from "@/components/ui/Timeline";
import { DocumentsSection } from "./DocumentsSection";
import { PatientFormDrawer } from "./PatientFormDrawer";
import { StatusUpdateModal } from "./StatusUpdateModal";
import { formatDate, formatDateTime } from "@/lib/format";
import type { DirectoryEntry, Patient, PatientDocument, StatusHistoryEntry } from "@/lib/types";

interface SalesUserOption {
  id: string;
  name: string;
}

export function PatientDetailClient({
  patient,
  documents,
  history,
  salesUsers,
  people,
  allowAssignment,
  canDelete = false,
}: {
  patient: Patient;
  documents: PatientDocument[];
  history: StatusHistoryEntry[];
  salesUsers: SalesUserOption[];
  people: DirectoryEntry[];
  allowAssignment: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(false);
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);

  const namesById: Record<string, string> = Object.fromEntries(people.map((p) => [p.id, p.name]));
  const assignedName = patient.assigned_to ? namesById[patient.assigned_to] : undefined;
  const creatorName = patient.created_by ? namesById[patient.created_by] : undefined;

  async function handleDeletePatient() {
    if (
      !window.confirm(
        `Permanently delete ${patient.name}? This also removes their documents and status history.`
      )
    ) {
      return;
    }
    setDeletingPatient(true);
    await fetch(`/api/backend/patients/${patient.id}`, { method: "DELETE" });
    router.push("/patients");
    router.refresh();
  }

  async function handleDeleteHistoryEntry(historyId: string) {
    if (!window.confirm("Remove this status history entry?")) return;
    setDeletingHistoryId(historyId);
    await fetch(`/api/backend/patients/${patient.id}/status-history/${historyId}`, {
      method: "DELETE",
    });
    setDeletingHistoryId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link href="/patients" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={patient.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">{patient.name}</h2>
              <StatusBadge status={patient.status} />
            </div>
            <p className="text-sm text-slate-500">{patient.country}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button onClick={() => setStatusOpen(true)}>Change Status</Button>
          {canDelete && (
            <Button variant="danger" onClick={handleDeletePatient} disabled={deletingPatient}>
              <Trash2 className="h-4 w-4" />
              {deletingPatient ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <StageTracker current={patient.status} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Patient Information</h3>
            <dl className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <dt className="text-slate-400">Full Name</dt>
                <dd className="mt-0.5 text-slate-900">{patient.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Country</dt>
                <dd className="mt-0.5 text-slate-900">{patient.country}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Phone</dt>
                <dd className="mt-0.5 text-slate-900">{patient.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Email</dt>
                <dd className="mt-0.5 text-slate-900">{patient.email ?? "—"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Medical Information</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-slate-400">Medical Condition</p>
                <p className="mt-0.5 text-slate-900">{patient.medical_condition ?? "—"}</p>
              </div>
              <div>
                <p className="text-slate-400">Description</p>
                <p className="mt-0.5 leading-relaxed text-slate-700">
                  {patient.medical_description ?? "—"}
                </p>
              </div>
            </div>
          </Card>

          <DocumentsSection patientId={patient.id} documents={documents} namesById={namesById} />

          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Status History</h3>
            <Timeline
              entries={history}
              namesById={namesById}
              canDelete={canDelete}
              deletingId={deletingHistoryId}
              onDelete={handleDeleteHistoryEntry}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Assigned Sales User
            </h3>
            {assignedName ? (
              <div className="flex items-center gap-3">
                <Avatar name={assignedName} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{assignedName}</p>
                  <p className="text-xs text-slate-500">Currently owns this lead</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Unassigned</p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Added By
            </h3>
            {creatorName ? (
              <div className="flex items-center gap-3">
                <Avatar name={creatorName} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{creatorName}</p>
                  <p className="text-xs text-slate-500">Created {formatDate(patient.created_at)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Unknown</p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Contact Information
            </h3>
            <div className="space-y-1.5 text-sm text-slate-700">
              <p>{patient.phone ?? "No phone on file"}</p>
              <p>{patient.email ?? "No email on file"}</p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Current Stage
            </h3>
            <StatusBadge status={patient.status} />
            <div className="mt-4 space-y-1 text-xs text-slate-400">
              <p>Created {formatDate(patient.created_at)}</p>
              <p>Updated {formatDateTime(patient.updated_at)}</p>
            </div>
          </Card>
        </div>
      </div>

      <PatientFormDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        patient={patient}
        salesUsers={salesUsers}
        allowAssignment={allowAssignment}
      />
      {statusOpen && (
        <StatusUpdateModal
          patientId={patient.id}
          currentStatus={patient.status}
          onClose={() => setStatusOpen(false)}
        />
      )}
    </div>
  );
}
