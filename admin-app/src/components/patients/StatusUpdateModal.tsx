"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { PATIENT_STATUSES, STATUS_LABELS, type PatientStatus } from "@/lib/types";

export function StatusUpdateModal({
  patientId,
  currentStatus,
  onClose,
}: {
  patientId: string;
  currentStatus: PatientStatus;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<PatientStatus>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentIndex = PATIENT_STATUSES.indexOf(currentStatus);

  async function handleSubmit() {
    if (selected === currentStatus) {
      onClose();
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/backend/patients/${patientId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: selected }),
    });
    const json = await res.json();

    if (!json.success) {
      setError(json.error.message);
      setSubmitting(false);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Update Patient Status</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-danger-light px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-sm text-slate-500">Current status</span>
            <StatusBadge status={currentStatus} />
          </div>

          <div className="space-y-2">
            {PATIENT_STATUSES.map((status, i) => {
              const isSelected = selected === status;
              const isPast = i < currentIndex;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelected(status)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary-light/40 font-medium text-primary-dark"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border-2 text-[10px]",
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : isPast
                          ? "border-primary text-primary"
                          : "border-slate-300"
                    )}
                  >
                    {(isSelected || isPast) && "✓"}
                  </span>
                  {STATUS_LABELS[status]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Updating…" : "Update Status"}
          </Button>
        </div>
      </div>
    </div>
  );
}
