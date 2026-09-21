import Link from "next/link";
import { Plus, Eye, Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { StatusPipeline } from "@/components/ui/StatusPipeline";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/format";
import type { AdminDashboard, MyDashboard, Patient, PatientListResult, Profile } from "@/lib/types";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function RecentPatientsTable({ patients }: { patients: Patient[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-400 uppercase">
          <th className="px-6 py-3 font-medium">Patient</th>
          <th className="px-3 py-3 font-medium">Country</th>
          <th className="px-3 py-3 font-medium">Status</th>
          <th className="px-3 py-3 font-medium">Updated</th>
          <th className="px-6 py-3 font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {patients.map((patient) => (
          <tr key={patient.id} className="border-t border-slate-100">
            <td className="px-6 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={patient.name} size="sm" />
                <span className="font-medium text-slate-900">{patient.name}</span>
              </div>
            </td>
            <td className="px-3 py-3 text-slate-600">{patient.country}</td>
            <td className="px-3 py-3">
              <StatusBadge status={patient.status} />
            </td>
            <td className="px-3 py-3 text-slate-500">{formatRelativeTime(patient.updated_at)}</td>
            <td className="px-6 py-3">
              <div className="flex items-center gap-2">
                <Link
                  href={`/patients/${patient.id}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/patients/${patient.id}?edit=1`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </div>
            </td>
          </tr>
        ))}
        {patients.length === 0 && (
          <tr>
            <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
              No patients yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default async function DashboardPage() {
  const { profile } = await apiFetch<{ profile: Profile }>("/api/auth/me");
  const isAdmin = profile.role === "ADMIN";
  const firstName = profile.name.split(" ")[0];

  const [dashboard, recent] = await Promise.all([
    isAdmin
      ? apiFetch<AdminDashboard>("/api/dashboard")
      : apiFetch<MyDashboard>("/api/dashboard/my"),
    apiFetch<PatientListResult>("/api/patients?page=1&pageSize=6"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            {greeting()}, {firstName}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Here's what's happening with your patient pipeline."
              : "Here's what's happening with your patient cases."}
          </p>
        </div>
        <Link href="/patients?new=1">
          <Button>
            <Plus className="h-4 w-4" />
            Add Patient
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Total Patients"
          value={dashboard.totalPatients}
          hint={isAdmin ? "Across all statuses" : "Assigned to you"}
        />
        <StatCard label="New" value={dashboard.statusCounts.NEW} hint="Needs first contact" hintColor="blue" />
        <StatCard label="In Discussion" value={dashboard.statusCounts.IN_DISCUSSION} />
        <StatCard label="Active" value={dashboard.statusCounts.ACTIVE} hint="In active care" hintColor="green" />
        <StatCard label="Closed" value={dashboard.statusCounts.CLOSED} />
      </div>

      <StatusPipeline counts={dashboard.statusCounts} />

      {isAdmin ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-semibold text-slate-900">Recent Patients</h3>
              <Link href="/patients" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            <RecentPatientsTable patients={recent.patients} />
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="font-semibold text-slate-900">Sales Team Overview</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase">
                  <th className="px-6 py-3 font-medium">Sales Person</th>
                  <th className="px-2 py-3 text-center font-medium">Patients</th>
                  <th className="px-2 py-3 text-center font-medium">Active</th>
                  <th className="px-2 py-3 text-center font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard as AdminDashboard).byUser
                  .filter((u) => u.userId !== null)
                  .sort((a, b) => b.count - a.count)
                  .map((user) => (
                    <tr key={user.userId} className="border-t border-slate-100">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={user.name} size="sm" />
                          <span className="font-medium text-slate-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-600">{user.count}</td>
                      <td className="px-2 py-3 text-center font-medium text-green-600">
                        {user.statusCounts.ACTIVE}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-500">{user.statusCounts.CLOSED}</td>
                    </tr>
                  ))}
                {(dashboard as AdminDashboard).byUser.filter((u) => u.userId !== null).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      No sales activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Your Recent Patients</h3>
            <Link href="/patients" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <RecentPatientsTable patients={recent.patients} />
        </Card>
      )}
    </div>
  );
}
