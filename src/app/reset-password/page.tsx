import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" subtitle="Pick something strong that you have not used elsewhere.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
