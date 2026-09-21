import { cn } from "@/lib/cn";
import { STATUS_LABELS, type PatientStatus, type UserRole } from "@/lib/types";

const STATUS_STYLES: Record<PatientStatus, string> = {
  NEW: "bg-blue-100 text-blue-700",
  PATIENT_REPLIED: "bg-sky-100 text-sky-700",
  REPORT_RECEIVED: "bg-amber-100 text-amber-700",
  TREATMENT_PLAN_SENT: "bg-amber-100 text-amber-800",
  IN_DISCUSSION: "bg-indigo-100 text-indigo-700",
  ACTIVE: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status, className }: { status: PatientStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
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

export function ActiveIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        active ? "text-green-600" : "text-slate-400"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-green-500" : "bg-slate-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
