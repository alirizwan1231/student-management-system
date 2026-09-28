import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900">
        <h1 className="mb-1 text-2xl font-semibold text-brand-700 dark:text-brand-400">Create your account</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          Your semesters, subjects and notes stay private to you.
        </p>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
