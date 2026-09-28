import Link from "next/link";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { isOverdue } from "@/lib/db/repo/tasks";
import type { AcademicTask } from "@/types/academic";

export function UpcomingTasksTable({
  tasks,
  subjectNames,
}: {
  tasks: AcademicTask[];
  subjectNames: Record<string, string>;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Upcoming tasks</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Tasks that need your attention</p>
        </div>

        {tasks.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
            {tasks.length}
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center px-5 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No upcoming tasks</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Add a task to see it appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                  Subject
                </th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                  Task
                </th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                  Deadline
                </th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {tasks.map((task) => (
                <tr key={task.id} className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.025]">
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {subjectNames[task.subject_id] ?? "—"}
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <Link
                      href={`/subjects/${task.subject_id}/tasks`}
                      className="font-semibold text-slate-800 transition-colors hover:text-brand-600 hover:underline dark:text-slate-100 dark:hover:text-brand-400"
                    >
                      {task.title}
                    </Link>
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs ${
                        task.deadline && isOverdue(task)
                          ? "font-semibold text-status-overdue"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {task.deadline
                        ? new Date(task.deadline).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "No deadline"}
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <TaskStatusBadge status={isOverdue(task) ? "overdue" : task.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
