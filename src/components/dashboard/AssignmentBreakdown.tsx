export function AssignmentBreakdown({
  completed,
  inProgress,
  pending,
}: {
  completed: number;
  inProgress: number;
  pending: number;
}) {
  const total = completed + inProgress + pending || 1;

  const completedPercent = (completed / total) * 100;
  const progressPercent = (inProgress / total) * 100;
  const pendingPercent = (pending / total) * 100;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Task breakdown</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Current distribution of your tasks
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
          {total} total
        </span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="flex h-full w-full">
          <div className="bg-status-completed transition-all duration-500" style={{ width: `${completedPercent}%` }} />
          <div className="bg-status-progress transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          <div
            className="bg-slate-300 transition-all duration-500 dark:bg-slate-700"
            style={{ width: `${pendingPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-emerald-50/70 p-3 dark:bg-emerald-500/[0.06]">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-completed" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Done
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{completed}</p>
        </div>

        <div className="rounded-xl bg-brand-50/70 p-3 dark:bg-brand-500/[0.06]">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-status-progress" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Progress
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{inProgress}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Pending
            </span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{pending}</p>
        </div>
      </div>
    </section>
  );
}
