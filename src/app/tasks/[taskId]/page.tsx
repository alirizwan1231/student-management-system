import { TaskDetail } from "@/components/tasks/TaskDetail";

export default function TaskDetailPage({ params }: { params: { taskId: string } }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <TaskDetail taskId={params.taskId} />
    </main>
  );
}
