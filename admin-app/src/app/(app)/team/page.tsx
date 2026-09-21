import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { RoleBadge, ActiveIndicator } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/format";
import type { AdminDashboard, Profile } from "@/lib/types";

export default async function TeamPage() {
  const [{ profile }, salesUsers, dashboard] = await Promise.all([
    apiFetch<{ profile: Profile }>("/api/auth/me"),
    apiFetch<Pick<Profile, "id" | "name" | "email" | "role" | "created_at">[]>("/api/users"),
    apiFetch<AdminDashboard>("/api/dashboard"),
  ]);

  const countByUserId = new Map(dashboard.byUser.map((u) => [u.userId, u.count]));
  const rows = [profile, ...salesUsers];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Team</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sales users create their own account from the Sales App login page — they show up here
          as soon as they register.
        </p>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 uppercase">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Role</th>
              <th className="px-3 py-3 font-medium">Patients</th>
              <th className="px-3 py-3 font-medium">Joined</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={user.name} size="sm" />
                    <span className="font-medium text-slate-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-600">{user.email}</td>
                <td className="px-3 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-3 py-3 text-slate-600">{countByUserId.get(user.id) ?? 0}</td>
                <td className="px-3 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                <td className="px-6 py-3">
                  <ActiveIndicator active />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
