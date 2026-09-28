"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSubject } from "@/hooks/useSubjects";
import { cn } from "@/lib/utils/cn";

// This is the fix for "there's no way to add a task/resource" -- those
// pages existed as routes since batches 06/07 but nothing linked to them.
// Every /subjects/[subjectId]/* route now renders inside this tab bar.
export function SubjectTabs({ subjectId }: { subjectId: string }) {
  const subject = useSubject(subjectId);
  const pathname = usePathname();

  const tabs = [
    { href: `/subjects/${subjectId}`, label: "Lectures" },
    { href: `/subjects/${subjectId}/tasks`, label: "Tasks" },
    { href: `/subjects/${subjectId}/resources`, label: "Resources" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 pt-6">
      <div className="mb-4 flex items-center gap-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: subject?.color || "#3366ff" }}
        />
        <h1 className="truncate text-2xl font-display font-semibold text-slate-900 dark:text-slate-50">
          {subject?.name ?? "Subject"}
        </h1>
        {subject?.code && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {subject.code}
          </span>
        )}
      </div>
      <nav className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-t-lg px-4 py-2 text-sm font-medium transition",
                active
                  ? "border-b-2 border-brand-600 text-brand-700 dark:text-brand-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
