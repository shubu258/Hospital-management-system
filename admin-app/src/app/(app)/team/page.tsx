import { apiFetch } from "@/lib/api";
import { TeamTable, type TeamMember } from "@/components/team/TeamTable";
import type { AdminDashboard, Profile } from "@/lib/types";

export default async function TeamPage() {
  const [{ profile }, salesUsers, dashboard] = await Promise.all([
    apiFetch<{ profile: Profile }>("/api/auth/me"),
    apiFetch<TeamMember[]>("/api/users?include=removed"),
    apiFetch<AdminDashboard>("/api/dashboard"),
  ]);

  const patientCounts = Object.fromEntries(
    dashboard.byUser.filter((u) => u.userId).map((u) => [u.userId!, u.count])
  );
  // Active members first, removed ones at the bottom.
  const members: TeamMember[] = [
    profile,
    ...salesUsers.filter((u) => !u.removed_at),
    ...salesUsers.filter((u) => u.removed_at),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Team</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sales users create their own account from the Sales App login page — they show up here
          as soon as they register. Removing someone blocks their access immediately.
        </p>
      </div>

      <TeamTable members={members} patientCounts={patientCounts} currentUserId={profile.id} />
    </div>
  );
}
