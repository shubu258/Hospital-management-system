import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Field, TextInput } from "@/components/ui/Field";
import type { Profile } from "@/lib/types";

export default async function SettingsPage() {
  const { profile } = await apiFetch<{ profile: Profile }>("/api/auth/me");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your profile and account.</p>
      </div>

      <Card className="p-6">
        <h3 className="mb-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">Profile</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name">
            <TextInput value={profile.name} disabled />
          </Field>
          <Field label="Email">
            <TextInput value={profile.email} disabled />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Editing your profile isn&apos;t available yet — this view is read-only.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="mb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">Account</h3>
        <p className="mb-4 text-sm text-slate-500">Update the password used to sign in.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Current Password">
            <TextInput type="password" placeholder="Enter current password" disabled />
          </Field>
          <Field label="New Password">
            <TextInput type="password" placeholder="At least 10 characters" disabled />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Password changes aren&apos;t available yet in this version.
        </p>
      </Card>
    </div>
  );
}
