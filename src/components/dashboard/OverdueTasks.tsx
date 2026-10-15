import type { AcademicTask } from "@/types/academic";

export function OverdueTasks({ tasks }: { tasks: AcademicTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-200/80 bg-white shadow-sm dark:border-rose-500/15 dark:bg-white/[0.025]">
      <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-5 py-4 dark:border-rose-500/10 dark:bg-rose-500/[0.05]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5">
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path
                d="M10.3 4.8 3.7 16.2A2 2 0 0 0 5.4 19h13.2a2 2 0 0 0 1.7-2.8L13.7 4.8a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-sm font-bold text-rose-700 dark:text-rose-300">Overdue tasks</h2>
            <p className="mt-0.5 text-[11px] text-rose-500/80 dark:text-rose-400/70">
              Tasks that need your attention
            </p>
          </div>
        </div>

        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {tasks.length}
        </span>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.025]"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                {task.title}
              </p>

              {task.deadline && (
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  Was due{" "}
                  {new Date(task.deadline).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-400 dark:text-slate-700"
            >
              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </li>
        ))}
      </ul>
    </section>
  );
}
