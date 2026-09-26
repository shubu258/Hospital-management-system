"use client";

import { cn } from "@/lib/cn";
import { STATUS_COLOR_CLASSES, useStatuses } from "@/lib/statuses";
import type { PatientStatus, UserRole } from "@/lib/types";

export function StatusBadge({ status, className }: { status: PatientStatus; className?: string }) {
  const { byKey } = useStatuses();
  const def = byKey.get(status);
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
        STATUS_COLOR_CLASSES[def?.color ?? "slate"].badge,
        className
      )}
    >
      {def?.label ?? status}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const isAdmin = role === "ADMIN";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        isAdmin ? "bg-teal-100 text-teal-700" : "bg-slate-200 text-slate-600"
      )}
    >
      {isAdmin ? "Admin" : "Sales User"}
    </span>
  );
}

export function ActiveIndicator({ active, label }: { active: boolean; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        active ? "text-green-600" : "text-slate-400"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-green-500" : "bg-slate-400")} />
      {label ?? (active ? "Active" : "Inactive")}
    </span>
  );
}
