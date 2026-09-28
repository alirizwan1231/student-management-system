"use client";

import { useUser } from "@/hooks/useUser";
import { useAllTasks } from "@/hooks/useTasks";
import { TaskList } from "@/components/tasks/TaskList";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";

export default function AllTasksPage() {
  const { user } = useUser();
  const tasks = useAllTasks(user?.id);

  if (!user) return null;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-brand-700 dark:text-brand-400">All tasks</h1>
        <AddTaskModal userId={user.id} />
      </div>
      <TaskList tasks={tasks} />
    </main>
  );
}
