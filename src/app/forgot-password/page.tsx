import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a link to choose a new one."
      footer={
        <Link href="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
