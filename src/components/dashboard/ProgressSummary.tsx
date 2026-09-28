export function ProgressSummary({
  completedCount,
  totalCount,
  progressPercent,
}: {
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}) {
  const safePercent = Math.min(100, Math.max(0, progressPercent));

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-status-completed" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Academic progress
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Your completed task progress
          </p>
        </div>

        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {progressPercent}%
        </span>
      </div>

      <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-status-completed transition-all duration-700"
          style={{ width: `${safePercent}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-slate-400 dark:text-slate-500">
          {completedCount} of {totalCount} tasks completed
        </span>

        <span className="font-semibold text-status-completed">
          {totalCount - completedCount} remaining
        </span>
      </div>
    </section>
  );
}
