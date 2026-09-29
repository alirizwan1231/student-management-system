"use client";

import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useInstructorsOverview } from "@/hooks/useInstructors";

export function InstructorsOverview() {
  const { user } = useUser();
  const summaries = useInstructorsOverview(user?.id);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Instructors</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Every instructor you've added while creating subjects, with their subjects and tasks.
        </p>
      </header>

      {summaries.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <Users size={22} />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">No instructors yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Add an instructor name when creating a subject and they'll show up here.
          </p>
          <Link
            href="/semesters"
            className="mt-5 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Go to subjects
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaries.map(({ lecturer, subjectCount, taskCount }) => (
            <Link
              key={lecturer.id}
              href={`/instructors/${lecturer.id}`}
              className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-white/[0.12]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">{lecturer.name}</h2>
                  {lecturer.email && <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{lecturer.email}</p>}
                </div>
                <ChevronRight size={16} className="mt-1 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" />
              </div>

              <div className="mt-5 flex items-center gap-5">
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{subjectCount}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{subjectCount === 1 ? "Subject" : "Subjects"}</p>
                </div>
                <div className="h-8 w-px bg-slate-100 dark:bg-white/[0.06]" />
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{taskCount}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{taskCount === 1 ? "Task" : "Tasks"}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
