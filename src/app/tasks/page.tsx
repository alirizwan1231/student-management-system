"use client";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useAllTasks } from "@/hooks/useTasks";
import { TaskList } from "@/components/tasks/TaskList";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { isInThisWeek, isOverdueDeadline, isUpcomingDeadline, todayIso } from "@/lib/utils/date-ranges";
const FILTERS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "thisweek", label: "This Week" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "high", label: "High Priority" },
];
function AllTasks() {
  const { user } = useUser();
  const tasks = useAllTasks(user?.id);
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("filter") ?? "all";
  const filtered = useMemo(() => {
    const today = todayIso();
    switch (activeFilter) {
      case "today":
        return tasks.filter((t) => t.deadline && t.deadline.slice(0, 10) === today && t.status !== "completed");
      case "thisweek":
        return tasks.filter((t) => isInThisWeek(t.deadline) && t.status !== "completed");
      case "upcoming":
        return tasks.filter((t) => isUpcomingDeadline(t.deadline, t.status));
      case "overdue":
        return tasks.filter((t) => isOverdueDeadline(t.deadline, t.status));
      case "completed":
        return tasks.filter((t) => t.status === "completed");
      case "pending":
        return tasks.filter((t) => t.status === "pending");
      case "high":
        return tasks.filter((t) => t.priority === "high" && t.status !== "completed");
      default:
        return tasks;
    }
  }, [tasks, activeFilter]);
  if (!user) return null;
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-brand-700 dark:text-brand-400">All tasks</h1>
        <AddTaskModal userId={user.id} />
      </div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={f.key === "all" ? "/tasks" : `/tasks?filter=${f.key}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              activeFilter === f.key
                ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>
      <TaskList tasks={filtered} />
    </main>
  );
}

// useSearchParams() must sit inside a Suspense boundary for the production build.
export default function AllTasksPage() {
  return (
    <Suspense fallback={null}>
      <AllTasks />
    </Suspense>
  );
}
