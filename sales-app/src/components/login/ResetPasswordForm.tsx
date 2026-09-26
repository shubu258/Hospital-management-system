"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";

export function ResetPasswordForm({ tokenHash }: { tokenHash: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenHash, password }),
    });
    const json = await res.json();
    setLoading(false);

    if (!json.success) {
      setError(json.error.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-primary-dark">
          Your password has been reset. You can now log in with your new password.
        </div>
        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">New password</span>
        <TextInput
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirm new password</span>
        <TextInput
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
        />
      </label>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving…" : "Reset password"}
      </Button>
    </form>
  );
}
