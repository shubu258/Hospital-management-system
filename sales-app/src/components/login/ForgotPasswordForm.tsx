"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setLoading(false);

    if (!json.success) {
      setError(json.error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-primary-dark">
          If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a
          link to reset your password. Check your inbox (and spam folder).
        </div>
        <Link href="/login" className="block text-center text-sm font-medium text-primary hover:underline">
          Back to login
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
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Email address</span>
        <TextInput
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@karishava.com"
        />
      </label>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Sending…" : "Send reset link"}
      </Button>

      <Link href="/login" className="block text-center text-sm font-medium text-primary hover:underline">
        Back to login
      </Link>
    </form>
  );
}
