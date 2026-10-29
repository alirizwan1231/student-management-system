import type { TaskStatus } from "@/types/academic";
import { cn } from "@/lib/utils/cn";

const LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  overdue: "Overdue",
};

const COLOR: Record<TaskStatus, string> = {
  pending:
    "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:ring-white/[0.08]",

  in_progress:
    "bg-blue-50 text-blue-700 ring-blue-200/70 dark:bg-blue-500/[0.1] dark:text-blue-300 dark:ring-blue-400/20",

  completed:
    "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-500/[0.1] dark:text-emerald-300 dark:ring-emerald-400/20",

  overdue:
    "bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-500/[0.1] dark:text-rose-300 dark:ring-rose-400/20",
};

const DOT: Record<TaskStatus, string> = {
  pending: "bg-slate-400",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  overdue: "bg-rose-500",
};

export function TaskStatusBadge({
  status,
}: {
  status: TaskStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
        "ring-1 ring-inset",
        COLOR[status]
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          DOT[status]
        )}
      />

      {LABEL[status]}
    </span>
  );
}
