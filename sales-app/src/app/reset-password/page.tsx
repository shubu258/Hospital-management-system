import Link from "next/link";
import { AuthShell } from "@/components/login/AuthShell";
import { ResetPasswordForm } from "@/components/login/ResetPasswordForm";

// Reached from the link in Supabase's "Reset Password" email, which must be
// set to {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash: tokenHash, type } = await searchParams;
  const isValidLink = Boolean(tokenHash) && type === "recovery";

  return (
    <AuthShell
      headline="Choose a new password."
      blurb="Pick something you haven't used before. Once it's saved, you'll be signed out everywhere else."
      title="Reset your password"
      subtitle="Enter your new password below."
    >
      {isValidLink ? (
        <ResetPasswordForm tokenHash={tokenHash!} />
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-red-200 bg-danger-light px-3 py-2 text-sm text-danger">
            This reset link is invalid or incomplete. Please request a new one.
          </div>
          <Link
            href="/forgot-password"
            className="block text-center text-sm font-medium text-primary hover:underline"
          >
            Request a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
