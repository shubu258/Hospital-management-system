"use client";

import { Card } from "./Card";
import { cn } from "@/lib/cn";
import { STATUS_COLOR_CLASSES, useStatuses } from "@/lib/statuses";
import type { PatientStatus } from "@/lib/types";

export function StatusPipeline({ counts }: { counts: Record<PatientStatus, number> }) {
  const { active } = useStatuses();

  return (
    <Card className="p-6">
      <p className="mb-6 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Patient Pipeline
      </p>
      <div className="flex items-start overflow-x-auto">
        {active.map((status, i) => (
          <div key={status.key} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center px-1 text-center">
              <span className="text-2xl font-semibold text-slate-900">{counts[status.key] ?? 0}</span>
              <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full", STATUS_COLOR_CLASSES[status.color].dot)} />
              <span className="mt-2 text-xs whitespace-nowrap text-slate-500">{status.label}</span>
            </div>
            {i < active.length - 1 && <div className="mt-3 h-px min-w-4 flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>
    </Card>
  );
}
