import { Card } from "./Card";
import { PATIENT_STATUSES, STATUS_LABELS, type PatientStatus } from "@/lib/types";

export function StatusPipeline({ counts }: { counts: Record<PatientStatus, number> }) {
  return (
    <Card className="p-6">
      <p className="mb-6 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Patient Pipeline
      </p>
      <div className="flex items-start">
        {PATIENT_STATUSES.map((status, i) => (
          <div key={status} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center px-1 text-center">
              <span className="text-2xl font-semibold text-slate-900">{counts[status] ?? 0}</span>
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="mt-2 text-xs whitespace-nowrap text-slate-500">
                {STATUS_LABELS[status]}
              </span>
            </div>
            {i < PATIENT_STATUSES.length - 1 && (
              <div className="mt-3 h-px flex-1 bg-slate-200" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
