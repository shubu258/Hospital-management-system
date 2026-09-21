import { redirect } from "next/navigation";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import type { Profile } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let profile: Profile;
  try {
    ({ profile } = await apiFetch<{ profile: Profile }>("/api/auth/me"));
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 401) {
      redirect("/session-expired");
    }
    throw err;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <div className="flex flex-1 flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 bg-background p-8">{children}</main>
      </div>
    </div>
  );
}
