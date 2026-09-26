import { apiFetch } from "@/lib/api";
import { StatusesManager } from "@/components/statuses/StatusesManager";
import type { AdminDashboard } from "@/lib/types";

export default async function StatusesPage() {
  const dashboard = await apiFetch<AdminDashboard>("/api/dashboard");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Patient Statuses</h2>
        <p className="mt-1 text-sm text-slate-500">
          The stages every patient moves through. Changes here show up everywhere a status appears —
          in both the Admin and Sales apps.
        </p>
      </div>

      <StatusesManager counts={dashboard.statusCounts} />
    </div>
  );
}
