"use client";

import { useUser } from "@/hooks/useUser";
import { useSubjectTasks } from "@/hooks/useTasks";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskList } from "@/components/tasks/TaskList";

export default function SubjectTasksPage({ params }: { params: { subjectId: string } }) {
  const { user } = useUser();
  const tasks = useSubjectTasks(params.subjectId);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <TaskForm userId={user.id} subjectId={params.subjectId} />
      <TaskList tasks={tasks} />
    </div>
  );
}
