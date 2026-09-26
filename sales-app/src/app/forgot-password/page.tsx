import { AuthShell } from "@/components/login/AuthShell";
import { ForgotPasswordForm } from "@/components/login/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      headline="Locked out? Let's get you back in."
      blurb="Enter the email you use for Karishava and we'll send you a secure link to choose a new password."
      title="Forgot your password?"
      subtitle="We'll email you a reset link."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
