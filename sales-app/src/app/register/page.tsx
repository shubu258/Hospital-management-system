import Link from "next/link";
import { Link2 } from "lucide-react";
import { RegisterForm } from "@/components/login/RegisterForm";

export default function RegisterPage() {
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
            Every referral, one team, working the same case.
          </h1>
          <p className="mt-4 text-sm text-teal-100">
            Create your Sales account to start logging patients, tracking their status, and
            managing documents alongside the rest of the team.
          </p>
        </div>

        <p className="text-xs text-teal-200">© 2026 Karishava. Internal use only.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Create your account</h2>
          <p className="mt-1 text-sm text-slate-500">Join the Karishava sales team.</p>

          <div className="mt-6">
            <RegisterForm />
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
