import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-white/[0.07] dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white dark:bg-brand-500"><GraduationCap size={16} /></span>
            <span className="font-display text-sm font-bold text-slate-900 dark:text-white">University Manager</span>
          </Link>
          <nav className="flex gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/privacy" className="hover:text-brand-600">Privacy</Link>
            <Link href="/terms" className="hover:text-brand-600">Terms</Link>
            <Link href="/contact" className="hover:text-brand-600">Contact</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">Last updated: {updated}</p>
        <div className="mt-8 space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{children}</div>
        <p className="mt-12 text-center text-xs text-slate-400 dark:text-slate-500">
          <Link href="/dashboard" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Back to the app</Link>
        </p>
      </main>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="!mt-9 text-lg font-bold text-slate-900 dark:text-white">{children}</h2>;
}
export function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}
