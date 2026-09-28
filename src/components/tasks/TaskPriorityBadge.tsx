import type { TaskPriority } from "@/types/academic";
import { cn } from "@/lib/utils/cn";

const COLOR: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-white/[0.05] dark:text-slate-400 dark:ring-white/[0.08]",

  medium:
    "bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-500/[0.08] dark:text-amber-300 dark:ring-amber-400/20",

  high:
    "bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-500/[0.08] dark:text-rose-300 dark:ring-rose-400/20",
};

const DOT: Record<TaskPriority, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-rose-500",
};

export function TaskPriorityBadge({
  priority,
}: {
  priority: TaskPriority;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize",
        "ring-1 ring-inset",
        COLOR[priority]
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          DOT[priority]
        )}
      />

      {priority}
    </span>
  );
}
