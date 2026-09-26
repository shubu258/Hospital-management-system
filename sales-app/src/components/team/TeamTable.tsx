"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, UserMinus, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectInput } from "@/components/ui/Field";
import { ActiveIndicator, RoleBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/lib/types";

export type TeamMember = Pick<Profile, "id" | "name" | "email" | "role" | "created_at" | "removed_at">;

export function TeamTable({
  members,
  patientCounts,
  currentUserId,
}: {
  members: TeamMember[];
  patientCounts: Record<string, number>;
  currentUserId: string;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSalesUsers = members.filter((m) => m.role === "SALES_USER" && !m.removed_at);

  async function handleRestore(member: TeamMember) {
    if (!window.confirm(`Restore ${member.name}? They'll be able to sign in again.`)) return;
    setRestoringId(member.id);
    setError(null);
    const res = await fetch(`/api/backend/users/${member.id}/restore`, { method: "POST" });
    const json = await res.json().catch(() => null);
    setRestoringId(null);
    if (!json?.success) {
      setError(json?.error?.message ?? "Could not restore this member");
      return;
    }
    router.refresh();
  }

  return (
    <>
      {error && (
        <div className="rounded-lg border border-red-200 bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 uppercase">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Role</th>
              <th className="px-3 py-3 font-medium">Patients</th>
              <th className="px-3 py-3 font-medium">Joined</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-6 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isRemoved = Boolean(member.removed_at);
              const canManage = member.role === "SALES_USER" && member.id !== currentUserId;
              return (
                <tr key={member.id} className="border-t border-slate-100">
                  <td className="px-6 py-3">
                    <div className={isRemoved ? "flex items-center gap-3 opacity-60" : "flex items-center gap-3"}>
                      <Avatar name={member.name} size="sm" />
                      <span className="font-medium text-slate-900">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{member.email}</td>
                  <td className="px-3 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-3 py-3 text-slate-600">{patientCounts[member.id] ?? 0}</td>
                  <td className="px-3 py-3 text-slate-500">{formatDate(member.created_at)}</td>
                  <td className="px-3 py-3">
                    {isRemoved ? (
                      <ActiveIndicator active={false} label={`Removed ${formatDate(member.removed_at!)}`} />
                    ) : (
                      <ActiveIndicator active />
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {canManage &&
                      (isRemoved ? (
                        <Button
                          variant="secondary"
                          className="px-3 py-1.5"
                          onClick={() => handleRestore(member)}
                          disabled={restoringId === member.id}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {restoringId === member.id ? "Restoring…" : "Restore"}
                        </Button>
                      ) : (
                        <Button variant="danger" className="px-3 py-1.5" onClick={() => setRemoving(member)}>
                          <UserMinus className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {removing && (
        <RemoveMemberModal
          member={removing}
          patientCount={patientCounts[removing.id] ?? 0}
          others={activeSalesUsers.filter((m) => m.id !== removing.id)}
          onClose={() => setRemoving(null)}
          onRemoved={() => {
            setRemoving(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function RemoveMemberModal({
  member,
  patientCount,
  others,
  onClose,
  onRemoved,
}: {
  member: TeamMember;
  patientCount: number;
  others: TeamMember[];
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [reassignTo, setReassignTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRemove() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/backend/users/${member.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reassign_to: reassignTo || null }),
    });
    const json = await res.json().catch(() => null);
    setSubmitting(false);
    if (!json?.success) {
      setError(json?.error?.message ?? "Could not remove this member");
      return;
    }
    onRemoved();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Remove {member.name}?</h2>
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
          <ul className="list-disc space-y-1 pl-5">
            <li>They&apos;re signed out right away and can&apos;t log in, with a password or Google.</li>
            <li>
              <span className="font-medium text-slate-700">{member.email}</span> can&apos;t be used to
              create a new account.
            </li>
            <li>Patients, documents and history they added stay in the platform.</li>
          </ul>
          {patientCount > 0 && (
            <label className="block">
              <span className="mb-1.5 block font-medium text-slate-700">
                {patientCount} {patientCount === 1 ? "patient is" : "patients are"} assigned to them.
                Reassign to:
              </span>
              <SelectInput value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
                <option value="">Leave unassigned</option>
                {others.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </SelectInput>
            </label>
          )}
          <p className="text-xs text-slate-400">You can restore them later from this page.</p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleRemove} disabled={submitting}>
            {submitting ? "Removing…" : "Remove Member"}
          </Button>
        </div>
      </div>
    </div>
  );
}
