import { cn } from "@/lib/cn";
import { PATIENT_STATUSES, STATUS_LABELS, type PatientStatus } from "@/lib/types";

export function StageTracker({ current }: { current: PatientStatus }) {
  const currentIndex = PATIENT_STATUSES.indexOf(current);

  return (
    <div className="flex items-start">
      {PATIENT_STATUSES.map((status, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs",
                  isDone && "border-primary bg-primary text-white",
                  isCurrent && "border-primary bg-white text-primary",
                  !isDone && !isCurrent && "border-slate-300 bg-white text-slate-300"
                )}
              >
                {isDone ? (
                  "✓"
                ) : (
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isCurrent ? "bg-primary" : "bg-slate-300"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  isCurrent ? "font-semibold text-slate-900" : "text-slate-400"
                )}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
            {i < PATIENT_STATUSES.length - 1 && (
              <div
                className={cn(
                  "mx-2 mb-5 h-0.5 flex-1",
                  i < currentIndex ? "bg-primary" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
