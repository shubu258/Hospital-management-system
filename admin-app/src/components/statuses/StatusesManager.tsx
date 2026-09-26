"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { STATUS_COLOR_CLASSES, useStatuses } from "@/lib/statuses";
import { STATUS_COLORS, type PatientStatusDef, type StatusColor } from "@/lib/types";

async function callApi(path: string, method: string, body?: unknown): Promise<string | null> {
  const res = await fetch(`/api/backend/statuses${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return json?.success ? null : (json?.error?.message ?? "Something went wrong");
}

function ColorSelect({ value, onChange }: { value: StatusColor; onChange: (c: StatusColor) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-3 w-3 shrink-0 rounded-full", STATUS_COLOR_CLASSES[value].dot)} />
      <SelectInput
        className="w-auto py-1.5 capitalize"
        value={value}
        onChange={(e) => onChange(e.target.value as StatusColor)}
        aria-label="Badge color"
      >
        {STATUS_COLORS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectInput>
    </div>
  );
}

export function StatusesManager({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const { active } = useStatuses();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<StatusColor>("slate");
  const [removing, setRemoving] = useState<PatientStatusDef | null>(null);

  async function run(action: () => Promise<string | null>): Promise<boolean> {
    setBusy(true);
    setError(null);
    const failure = await action();
    setBusy(false);
    if (failure) {
      setError(failure);
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (await run(() => callApi("", "POST", { label: newLabel, color: newColor }))) {
      setNewLabel("");
      setNewColor("slate");
    }
  }

  async function handleRename(key: string) {
    if (await run(() => callApi(`/${key}`, "PATCH", { label: editLabel }))) {
      setEditingKey(null);
    }
  }

  function handleMove(index: number, delta: -1 | 1) {
    const keys = active.map((s) => s.key);
    const target = index + delta;
    [keys[index], keys[target]] = [keys[target], keys[index]];
    void run(() => callApi("/order", "PUT", { keys }));
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 uppercase">
              <th className="w-12 px-6 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Color</th>
              <th className="px-3 py-3 font-medium">Patients</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {active.map((status, i) => {
              const isEditing = editingKey === status.key;
              return (
                <tr key={status.key} className="border-t border-slate-100">
                  <td className="px-6 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-3">
                    {isEditing ? (
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleRename(status.key);
                        }}
                      >
                        <TextInput
                          autoFocus
                          className="py-1.5"
                          value={editLabel}
                          maxLength={40}
                          onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => e.key === "Escape" && setEditingKey(null)}
                        />
                        <button
                          type="submit"
                          disabled={busy || !editLabel.trim()}
                          title="Save"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary-light/40 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingKey(null)}
                          title="Cancel"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </form>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
                          STATUS_COLOR_CLASSES[status.color].badge
                        )}
                      >
                        {status.label}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <ColorSelect
                      value={status.color}
                      onChange={(color) => void run(() => callApi(`/${status.key}`, "PATCH", { color }))}
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-600">{counts[status.key] ?? 0}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Move up"
                        disabled={busy || i === 0}
                        onClick={() => handleMove(i, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        disabled={busy || i === active.length - 1}
                        onClick={() => handleMove(i, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Rename"
                        disabled={busy}
                        onClick={() => {
                          setEditingKey(status.key);
                          setEditLabel(status.label);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Remove"
                        disabled={busy || active.length <= 1}
                        onClick={() => setRemoving(status)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-danger disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <form
          onSubmit={handleAdd}
          className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4"
        >
          <div className="min-w-[220px] flex-1">
            <TextInput
              value={newLabel}
              maxLength={40}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="New status name, e.g. Visa Processing"
            />
          </div>
          <ColorSelect value={newColor} onChange={setNewColor} />
          <Button type="submit" disabled={busy || !newLabel.trim()}>
            <Plus className="h-4 w-4" />
            Add Status
          </Button>
        </form>
      </Card>

      <p className="text-xs text-slate-400">
        New statuses are added at the end of the pipeline — use the arrows to move them. New
        patients always start in the first status.
      </p>

      {removing && (
        <RemoveStatusModal
          status={removing}
          patientCount={counts[removing.key] ?? 0}
          others={active.filter((s) => s.key !== removing.key)}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setRemoving(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RemoveStatusModal({
  status,
  patientCount,
  others,
  onClose,
  onRemoved,
}: {
  status: PatientStatusDef;
  patientCount: number;
  others: PatientStatusDef[];
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [moveTo, setMoveTo] = useState(others[0]?.key ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRemove() {
    setSubmitting(true);
    setError(null);
    const failure = await callApi(`/${status.key}`, "DELETE", patientCount > 0 ? { moveTo } : {});
    setSubmitting(false);
    if (failure) {
      setError(failure);
      return;
    }
    onRemoved();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Remove &ldquo;{status.label}&rdquo;?</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm text-slate-600">
          {error && (
            <div className="rounded-lg border border-red-200 bg-danger-light px-3 py-2 text-danger">{error}</div>
          )}
          <p>
            It will disappear from the pipeline, filters and status pickers across both apps. Past
            status history keeps showing its name.
          </p>
          {patientCount > 0 && (
            <label className="block">
              <span className="mb-1.5 block font-medium text-slate-700">
                {patientCount} {patientCount === 1 ? "patient is" : "patients are"} in this status.
                Move them to:
              </span>
              <SelectInput value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                {others.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </SelectInput>
              <span className="mt-1.5 block text-xs text-slate-400">
                Each move is recorded in the patient&apos;s status history.
              </span>
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleRemove}
            disabled={submitting || (patientCount > 0 && !moveTo)}
          >
            {submitting ? "Removing…" : "Remove Status"}
          </Button>
        </div>
      </div>
    </div>
  );
}
