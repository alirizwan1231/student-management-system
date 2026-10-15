"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useInstructorDetail } from "@/hooks/useInstructors";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { isOverdue } from "@/lib/db/repo/tasks";

export function InstructorDetail({ lecturerId }: { lecturerId: string }) {
  const { user } = useUser();
  const detail = useInstructorDetail(user?.id, lecturerId);

  if (detail === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
      </div>
    );
  }

  if (detail === null) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-white/[0.12]">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">This instructor could not be found.</p>
        <Link href="/instructors" className="mt-3 inline-flex text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Back to Instructors
        </Link>
      </div>
    );
  }

  const { lecturer, subjects, tasks, subjectNameById } = detail;
  const sortedTasks = [...tasks].sort((a, b) => (a.deadline ?? "") < (b.deadline ?? "") ? -1 : 1);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Instructors", href: "/instructors" }, { label: lecturer.name }]} />

      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{lecturer.name}</h1>
        {lecturer.email && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{lecturer.email}</p>}
      </header>

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-6">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Subjects ({subjects.length})
          </h2>
          {subjects.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No subjects linked to this instructor yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {subjects.map((subject) => (
                <Link
                  key={subject.id}
                  href={`/subjects/${subject.id}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-white/[0.07] dark:bg-white/[0.02] dark:hover:border-white/[0.12]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: subject.color || "#3366ff" }} />
                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{subject.name}</span>
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-6">
          <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Tasks across these subjects ({sortedTasks.length})
          </h2>
          {sortedTasks.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No tasks yet for this instructor's subjects.</p>
          ) : (
            <ul className="space-y-2">
              {sortedTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-white/[0.07] dark:bg-white/[0.02] dark:hover:border-white/[0.12]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{task.title}</p>
                      <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                        {subjectNameById[task.subject_id] ?? "Subject"}
                        {task.deadline ? ` • Due ${new Date(task.deadline).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <TaskStatusBadge status={isOverdue(task) ? "overdue" : task.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
