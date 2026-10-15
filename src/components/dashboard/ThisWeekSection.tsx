import type { AcademicTask } from "@/types/academic";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { isOverdue } from "@/lib/db/repo/tasks";

export function ThisWeekSection({ tasks }: { tasks: AcademicTask[] }) {
  return (
    <section className="rounded-2xl border border-brand-200/80 bg-white shadow-sm dark:border-brand-500/15 dark:bg-white/[0.025]">
      <div className="flex items-center justify-between border-b border-brand-100 bg-brand-50/60 px-5 py-4 dark:border-brand-500/10 dark:bg-brand-500/[0.04]">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            <h2 className="text-sm font-bold text-brand-700 dark:text-brand-300">This week</h2>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Upcoming academic deadlines
          </p>
        </div>

        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="flex min-h-[130px] items-center justify-center px-5">
          <p className="text-sm text-slate-400 dark:text-slate-500">Nothing due this week.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.025]"
            >
              <div
                className={`h-8 w-1 shrink-0 rounded-full ${
                  isOverdue(task)
                    ? "bg-status-overdue"
                    : task.status === "completed"
                      ? "bg-status-completed"
                      : "bg-status-progress"
                }`}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {task.title}
                </p>

                {task.deadline && (
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    {new Date(task.deadline).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>

              <TaskStatusBadge status={isOverdue(task) ? "overdue" : task.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
