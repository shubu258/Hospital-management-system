"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X, UploadCloud, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import type { Patient } from "@/lib/types";

interface SalesUserOption {
  id: string;
  name: string;
}

interface StagedFile {
  file: File;
  id: string;
}

export function PatientFormDrawer({
  open,
  onClose,
  mode,
  patient,
  salesUsers,
  allowAssignment,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  patient?: Patient;
  salesUsers: SalesUserOption[];
  allowAssignment: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(patient?.name ?? "");
  const [country, setCountry] = useState(patient?.country ?? "");
  const [phone, setPhone] = useState(patient?.phone ?? "");
  const [email, setEmail] = useState(patient?.email ?? "");
  const [medicalCondition, setMedicalCondition] = useState(patient?.medical_condition ?? "");
  const [medicalDescription, setMedicalDescription] = useState(patient?.medical_description ?? "");
  const [assignedTo, setAssignedTo] = useState(patient?.assigned_to ?? "");
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  if (!open) return null;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).map((file) => ({ file, id: `${file.name}-${file.size}-${Date.now()}` }));
    setFiles((prev) => [...prev, ...next]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name,
        country,
        phone: phone || null,
        email: email || null,
        medical_condition: medicalCondition || null,
        medical_description: medicalDescription || null,
      };
      if (mode === "create" && allowAssignment) {
        payload.assigned_to = assignedTo || null;
      }

      const url = mode === "create" ? "/api/backend/patients" : `/api/backend/patients/${patient!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error.message);
        setSubmitting(false);
        return;
      }

      const patientId = mode === "create" ? json.data.id : patient!.id;

      if (mode === "edit" && allowAssignment && assignedTo !== (patient?.assigned_to ?? "")) {
        await fetch(`/api/backend/patients/${patientId}/assign`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assigned_to: assignedTo }),
        });
      }

      for (const staged of files) {
        const formData = new FormData();
        formData.append("file", staged.file);
        await fetch(`/api/backend/patients/${patientId}/documents`, {
          method: "POST",
          body: formData,
        });
      }

      setSubmitting(false);
      onClose();
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === "create" ? "Add Patient" : "Edit Patient"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-danger-light px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Patient Information
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name" required>
                <TextInput
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amara Okafor"
                />
              </Field>
              <Field label="Country" required>
                <TextInput
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Nigeria"
                />
              </Field>
              <Field label="Phone">
                <TextInput
                  value={phone ?? ""}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+000 000 000000"
                />
              </Field>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={email ?? ""}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@email.com"
                />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Medical Information
            </p>
            <div className="space-y-4">
              <Field label="Medical Condition">
                <TextInput
                  value={medicalCondition ?? ""}
                  onChange={(e) => setMedicalCondition(e.target.value)}
                  placeholder="e.g. Coronary Artery Disease"
                />
              </Field>
              <Field label="Medical Description">
                <TextArea
                  value={medicalDescription ?? ""}
                  onChange={(e) => setMedicalDescription(e.target.value)}
                  placeholder="Relevant history, prior reports, patient notes…"
                />
              </Field>
            </div>
          </div>

          {allowAssignment && (
            <div>
              <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Assignment
              </p>
              <Field
                label="Sales Owner"
                hint={
                  mode === "create"
                    ? "Leave unassigned to assign later."
                    : "Reassigning updates the patient's owner immediately."
                }
              >
                <SelectInput value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                  <option value="">Unassigned</option>
                  {salesUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
          )}

          {mode === "create" && (
            <div>
              <p className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Documents
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  dragOver ? "border-primary bg-primary-light/40" : "border-slate-200 bg-slate-50"
                }`}
              >
                <UploadCloud className="h-6 w-6 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-medium text-primary">Drag and drop files</span>, or browse
                </p>
                <p className="mt-1 text-xs text-slate-400">PDF, JPG, JPEG or PNG</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((staged) => (
                    <li
                      key={staged.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2 truncate text-slate-700">
                        {staged.file.type === "application/pdf" ? (
                          <FileText className="h-4 w-4 shrink-0 text-danger" />
                        ) : (
                          <ImageIcon className="h-4 w-4 shrink-0 text-info" />
                        )}
                        <span className="truncate">{staged.file.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {(staged.file.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((f) => f.id !== staged.id))}
                        className="text-slate-400 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : mode === "create" ? "Create Patient" : "Save Changes"}
          </Button>
        </div>
        </form>
      </div>
    </div>
  );
}
