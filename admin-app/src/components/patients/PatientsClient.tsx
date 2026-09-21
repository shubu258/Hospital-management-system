"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Pagination } from "@/components/ui/Pagination";
import { PatientFormDrawer } from "./PatientFormDrawer";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import {
  PATIENT_STATUSES,
  STATUS_LABELS,
  type DirectoryEntry,
  type Patient,
  type PatientListResult,
  type PatientStatus,
} from "@/lib/types";

interface SalesUserOption {
  id: string;
  name: string;
}

export function PatientsClient({
  result,
  salesUsers,
  people,
  currentUserId,
  searchValue,
  statusValue,
  assignedToValue,
  createdByValue,
  page,
  showSalesOwnerFilter,
  allowAssignment,
  canDelete = false,
  defaultOpenNew,
}: {
  result: PatientListResult;
  salesUsers: SalesUserOption[];
  people: DirectoryEntry[];
  currentUserId: string;
  searchValue: string;
  statusValue: string;
  assignedToValue: string;
  createdByValue: string;
  page: number;
  showSalesOwnerFilter: boolean;
  allowAssignment: boolean;
  canDelete?: boolean;
  defaultOpenNew: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(searchValue);
  const [addOpen, setAddOpen] = useState(defaultOpenNew);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkAssignError, setBulkAssignError] = useState<string | null>(null);

  const namesById: Record<string, string> = Object.fromEntries(people.map((p) => [p.id, p.name]));
  const isMine = createdByValue === currentUserId;
  const columnCount = showSalesOwnerFilter ? 8 : 7;

  async function handleBulkAssign() {
    if (!bulkAssignTo || !statusValue) return;
    const label = STATUS_LABELS[statusValue as PatientStatus];
    const personName = salesUsers.find((u) => u.id === bulkAssignTo)?.name ?? "this person";
    if (
      !window.confirm(
        `Reassign every patient currently in "${label}" to ${personName}? This applies to every matching lead in the platform, not just the ones shown by your search text.`
      )
    ) {
      return;
    }
    setBulkAssigning(true);
    setBulkAssignError(null);
    const res = await fetch("/api/backend/patients/assign-by-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusValue, assigned_to: bulkAssignTo }),
    });
    const json = await res.json();
    setBulkAssigning(false);
    if (!json.success) {
      setBulkAssignError(json.error.message);
      return;
    }
    setBulkAssignTo("");
    router.refresh();
  }

  async function handleDelete(patient: Patient) {
    if (
      !window.confirm(
        `Permanently delete ${patient.name}? This also removes their documents and status history.`
      )
    ) {
      return;
    }
    setDeletingId(patient.id);
    await fetch(`/api/backend/patients/${patient.id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = {
      search: searchValue,
      status: statusValue,
      assigned_to: assignedToValue,
      created_by: createdByValue,
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    router.push(`/patients?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Patients</h2>
          <p className="mt-1 text-sm text-slate-500">Manage and track your international patient cases.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Patient
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => updateParams({ created_by: undefined })}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                !isMine ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              All Leads
            </button>
            <button
              type="button"
              onClick={() => updateParams({ created_by: currentUserId })}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors",
                isMine ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              My Leads
            </button>
          </div>
          <div className="min-w-[240px] flex-1">
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") updateParams({ search: search || undefined });
              }}
              placeholder="Search patients..."
            />
          </div>
          <SelectInput
            className="w-auto"
            value={statusValue}
            onChange={(e) => updateParams({ status: e.target.value || undefined })}
          >
            <option value="">All statuses</option>
            {PATIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </SelectInput>
          {showSalesOwnerFilter && (
            <SelectInput
              className="w-auto"
              value={assignedToValue}
              onChange={(e) => updateParams({ assigned_to: e.target.value || undefined })}
            >
              <option value="">All sales owners</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </SelectInput>
          )}
        </div>

        {allowAssignment && statusValue && (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-primary-light/30 px-6 py-3 text-sm">
            <span className="text-slate-700">
              Assign every <span className="font-medium">{STATUS_LABELS[statusValue as PatientStatus]}</span> lead
              to
            </span>
            <SelectInput
              className="w-auto"
              value={bulkAssignTo}
              onChange={(e) => setBulkAssignTo(e.target.value)}
            >
              <option value="">Choose sales person…</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </SelectInput>
            <Button
              variant="secondary"
              onClick={handleBulkAssign}
              disabled={!bulkAssignTo || bulkAssigning}
            >
              {bulkAssigning ? "Assigning…" : "Assign"}
            </Button>
            {bulkAssignError && <span className="text-danger">{bulkAssignError}</span>}
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 uppercase">
              <th className="px-6 py-3 font-medium">Patient</th>
              <th className="px-3 py-3 font-medium">Country</th>
              <th className="px-3 py-3 font-medium">Medical Condition</th>
              {showSalesOwnerFilter && <th className="px-3 py-3 font-medium">Sales Owner</th>}
              <th className="px-3 py-3 font-medium">Added By</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Updated</th>
              <th className="px-6 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {result.patients.map((patient) => (
              <tr key={patient.id} className="border-t border-slate-100">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={patient.name} size="sm" />
                    <div>
                      <p className="font-medium text-slate-900">{patient.name}</p>
                      {patient.phone && <p className="text-xs text-slate-400">{patient.phone}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-600">{patient.country}</td>
                <td className="px-3 py-3 text-slate-600">{patient.medical_condition ?? "—"}</td>
                {showSalesOwnerFilter && (
                  <td className="px-3 py-3 text-slate-600">
                    {patient.assigned_to ? (namesById[patient.assigned_to] ?? "Unknown") : "Unassigned"}
                  </td>
                )}
                <td className="px-3 py-3 text-slate-600">
                  {patient.created_by ? (namesById[patient.created_by] ?? "Unknown") : "Unknown"}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={patient.status} />
                </td>
                <td className="px-3 py-3 text-slate-500">{formatRelativeTime(patient.updated_at)}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditingPatient(patient)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(patient)}
                        disabled={deletingId === patient.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {result.patients.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-6 py-10 text-center text-slate-400">
                  No patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          page={page}
          pageSize={result.pagination.pageSize}
          total={result.pagination.total}
          basePath="/patients"
          params={{
            search: searchValue,
            status: statusValue,
            assigned_to: assignedToValue,
            created_by: createdByValue,
          }}
        />
      </Card>

      <PatientFormDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="create"
        salesUsers={salesUsers}
        allowAssignment={allowAssignment}
      />
      {editingPatient && (
        <PatientFormDrawer
          open={true}
          onClose={() => setEditingPatient(null)}
          mode="edit"
          patient={editingPatient}
          salesUsers={salesUsers}
          allowAssignment={allowAssignment}
        />
      )}
    </div>
  );
}
