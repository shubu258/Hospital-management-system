import { redirect } from "next/navigation";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { getStatuses } from "@/lib/statuses.server";
import { StatusesProvider } from "@/lib/statuses";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import type { PatientStatusDef, Profile } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let profile: Profile;
  let statuses: PatientStatusDef[];
  try {
    [{ profile }, statuses] = await Promise.all([
      apiFetch<{ profile: Profile }>("/api/auth/me"),
      getStatuses(),
    ]);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) {
      redirect("/session-expired");
    }
    // 403 from /me: an admin removed this account from the team.
    if (err instanceof ApiRequestError && err.status === 403) {
      redirect("/session-expired?reason=removed");
    }
    throw err;
  }

  return (
    <StatusesProvider statuses={statuses}>
      <div className="flex min-h-screen">
        <Sidebar profile={profile} />
        <div className="flex flex-1 flex-col">
          <Topbar profile={profile} />
          <main className="flex-1 bg-background p-8">{children}</main>
        </div>
      </div>
    </StatusesProvider>
  );
}
