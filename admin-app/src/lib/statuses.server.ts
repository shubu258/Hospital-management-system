import { cache } from "react";
import { apiFetch } from "./api";
import type { PatientStatusDef } from "./types";

// Deduplicated per request, so the layout and the page share one fetch.
export const getStatuses = cache(() => apiFetch<PatientStatusDef[]>("/api/statuses"));

// The built-in statuses the dashboard headline cards track. Admins can rename
// them (the key never changes) or remove them (the card then disappears).
export function liveStatus(statuses: PatientStatusDef[], key: string): PatientStatusDef | undefined {
  return statuses.find((s) => s.key === key && !s.archived_at);
}
