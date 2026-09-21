import { Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABELS, type StatusHistoryEntry } from "@/lib/types";

export function Timeline({
  entries,
  namesById,
  canDelete = false,
  deletingId = null,
  onDelete,
}: {
  entries: StatusHistoryEntry[];
  namesById: Record<string, string>;
  canDelete?: boolean;
  deletingId?: string | null;
  onDelete?: (entryId: string) => void;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">No status changes recorded yet.</p>;
  }

  return (
    <div className="space-y-6">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="group relative border-l-2 border-slate-100 pb-1 pl-5 last:border-transparent"
        >
          <span className="absolute top-1 -left-[5px] h-2 w-2 rounded-full bg-primary" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400">{formatDateTime(entry.created_at)}</p>
              <p className="mt-0.5 text-sm text-slate-700">
                Status changed —{" "}
                {entry.old_status && (
                  <>
                    <span className="text-slate-400">{STATUS_LABELS[entry.old_status]}</span>{" "}
                    <span className="text-slate-400">→</span>{" "}
                  </>
                )}
                <span className="font-medium text-slate-900">{STATUS_LABELS[entry.new_status]}</span>
              </p>
              <p className="text-xs text-slate-400">
                by {entry.changed_by ? (namesById[entry.changed_by] ?? "Unknown") : "Unknown"}
              </p>
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete?.(entry.id)}
                disabled={deletingId === entry.id}
                title="Remove this status history entry"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
