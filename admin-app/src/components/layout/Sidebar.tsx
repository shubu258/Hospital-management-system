"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, UserCog, Settings, Link2, ListOrdered } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/team", label: "Team", icon: UserCog, adminOnly: true },
  { href: "/statuses", label: "Statuses", icon: ListOrdered, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const isAdmin = profile.role === "ADMIN";
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-6 py-5">
        <Link2 className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold text-slate-900">Karishava</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-light text-primary-dark"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-4">
        <Avatar name={profile.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{profile.name}</p>
          <p className="text-xs text-slate-500">{isAdmin ? "Administrator" : "Sales User"}</p>
        </div>
      </div>
    </aside>
  );
}
