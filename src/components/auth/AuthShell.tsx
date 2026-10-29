import Link from "next/link";
import { GraduationCap } from "lucide-react";

// Shared frame for every public auth screen (login, forgot/reset password).
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-5 dark:bg-slate-950">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm dark:bg-brand-500">
            <GraduationCap size={20} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">University Manager</span>
        </Link>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm dark:border-white/[0.07] dark:bg-slate-900 sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1.5 mb-6 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
        </div>
        {footer && <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>}
        <p className="mt-6 flex justify-center gap-4 text-xs text-slate-400 dark:text-slate-500">
          <Link href="/privacy" className="hover:text-brand-600">Privacy</Link>
          <Link href="/terms" className="hover:text-brand-600">Terms</Link>
          <Link href="/contact" className="hover:text-brand-600">Contact</Link>
        </p>
      </div>
    </main>
  );
}
