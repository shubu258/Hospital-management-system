"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PatientStatus, PatientStatusDef, StatusColor } from "./types";

// Full class strings (not built from the color name) so Tailwind keeps them.
export const STATUS_COLOR_CLASSES: Record<StatusColor, { badge: string; dot: string }> = {
  slate: { badge: "bg-slate-200 text-slate-600", dot: "bg-slate-400" },
  blue: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  sky: { badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  indigo: { badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  violet: { badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  pink: { badge: "bg-pink-100 text-pink-700", dot: "bg-pink-500" },
  rose: { badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  amber: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  orange: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  green: { badge: "bg-green-100 text-green-700", dot: "bg-green-500" },
  teal: { badge: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
};

interface StatusesValue {
  // Live statuses in pipeline order — what pickers, filters and the
  // pipeline show.
  active: PatientStatusDef[];
  byKey: Map<PatientStatus, PatientStatusDef>;
  label: (key: PatientStatus) => string;
}

const StatusesContext = createContext<StatusesValue | null>(null);

// Loaded once in the (app) layout, so every page sees the admin's current
// statuses; router.refresh() after an edit reloads them everywhere.
export function StatusesProvider({
  statuses,
  children,
}: {
  statuses: PatientStatusDef[];
  children: ReactNode;
}) {
  const value = useMemo<StatusesValue>(() => {
    const byKey = new Map(statuses.map((s) => [s.key, s]));
    return {
      active: statuses.filter((s) => !s.archived_at).sort((a, b) => a.position - b.position),
      byKey,
      label: (key) => byKey.get(key)?.label ?? key,
    };
  }, [statuses]);

  return <StatusesContext.Provider value={value}>{children}</StatusesContext.Provider>;
}

export function useStatuses(): StatusesValue {
  const value = useContext(StatusesContext);
  if (!value) {
    throw new Error("useStatuses must be used inside <StatusesProvider>");
  }
  return value;
}
