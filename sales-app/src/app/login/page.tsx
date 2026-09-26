import Link from "next/link";
import { Link2 } from "lucide-react";
import { LoginForm } from "@/components/login/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; error?: string }>;
}) {
  const { expired, error } = await searchParams;

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[420px] shrink-0 flex-col justify-between overflow-hidden bg-primary-dark px-10 py-10 text-white lg:flex">
        <svg
          className="pointer-events-none absolute inset-x-0 top-16 h-40 w-full opacity-40"
          viewBox="0 0 400 160"
          fill="none"
        >
          <path
            d="M20 130 C 100 40, 180 40, 200 90 S 320 150, 380 30"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="2 6"
          />
          {[
            [20, 130],
            [110, 60],
            [200, 90],
            [300, 130],
            [380, 30],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={cx === 20 ? 5 : 3} fill="white" />
          ))}
        </svg>

        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          <span className="text-lg font-semibold">Karishava</span>
        </div>

        <div>
          <h1 className="text-3xl leading-snug font-semibold">
            One case record, from first contact to active care.
          </h1>
          <p className="mt-4 text-sm text-teal-100">
            Karishava keeps every patient referral, medical report, and hospital coordination step
            in one place — across every country your team works with.
          </p>
        </div>

        <p className="text-xs text-teal-200">© 2026 Karishava. Internal use only.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to your Karishava account.</p>

          {expired && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-warning-light px-3 py-2 text-sm text-warning">
              Your session expired. Please log in again.
            </div>
          )}

          {error === "removed" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-danger-light px-3 py-2 text-sm text-danger">
              This account has been removed from the team. Contact your administrator.
            </div>
          )}

          {error === "google" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-danger-light px-3 py-2 text-sm text-danger">
              Google sign-in didn&apos;t complete. Please try again.
            </div>
          )}

          <div className="mt-6">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to the sales team?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
