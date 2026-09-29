"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, Trash2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useTask } from "@/hooks/useTasks";
import { useSubject } from "@/hooks/useSubjects";
import { useLecturer } from "@/hooks/useLecturers";
import { useTaskResources } from "@/hooks/useResources";
import { deleteTask, isOverdue, setTaskStatus } from "@/lib/db/repo/tasks";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskPriorityBadge } from "@/components/tasks/TaskPriorityBadge";
import { ResourceForm } from "@/components/resources/ResourceForm";
import { ResourceList } from "@/components/resources/ResourceList";
import type { AcademicTask } from "@/types/academic";

export function TaskDetail({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { user } = useUser();
  const task = useTask(taskId);
  const subject = useSubject(task?.subject_id);
  const lecturer = useLecturer(subject?.lecturer_id ?? undefined);
  const attachments = useTaskResources(taskId);

  const [confirming, setConfirming] = useState(false);
  const [deletingRow, setDeletingRow] = useState(false);

  if (task === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-56 animate-pulse rounded bg-slate-200 dark:bg-white/[0.06]" />
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-white/[0.12]">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">This task could not be found.</p>
        <Link href="/tasks" className="mt-3 inline-flex text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Back to Tasks
        </Link>
      </div>
    );
  }

  const effectiveStatus = isOverdue(task) ? "overdue" : task.status;

  const handleDelete = async () => {
    setDeletingRow(true);
    await deleteTask(task.id);
    router.replace(subject ? `/subjects/${subject.id}/tasks` : "/tasks");
  };

  return (
    <article>
      <Breadcrumbs
        items={[
          { label: "Tasks", href: "/tasks" },
          ...(subject ? [{ label: subject.name, href: `/subjects/${subject.id}/tasks` }] : []),
          { label: task.title },
        ]}
      />

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <TaskStatusBadge status={effectiveStatus} />
          <TaskPriorityBadge priority={task.priority} />
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold capitalize text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
            {task.task_type}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1
              className={`break-words font-display text-2xl font-bold tracking-tight sm:text-3xl ${
                task.status === "completed" ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-white"
              }`}
            >
              {task.title}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {subject && (
                <Link href={`/subjects/${subject.id}/tasks`} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                  {subject.name}
                </Link>
              )}
              {(lecturer || subject?.lecturer_name) && (
                <span>
                  Taught by{" "}
                  {lecturer ? (
                    <Link href={`/instructors/${lecturer.id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                      {lecturer.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-600 dark:text-slate-300">{subject?.lecturer_name}</span>
                  )}
                </span>
              )}
              {task.deadline && <span>Due {new Date(task.deadline).toLocaleString()}</span>}
              {task.marks != null && <span>{task.marks} marks</span>}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <select
              value={task.status}
              onChange={(e) => setTaskStatus(task.id, e.target.value as AcademicTask["status"])}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-rose-500/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>
      </header>

      {confirming && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/[0.06]">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Delete this task?</p>
          <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80">
            &ldquo;{task.title}&rdquo; will be removed. This can&apos;t be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={deletingRow}
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {deletingRow && <Loader2 size={13} className="animate-spin" />}
              Yes, delete
            </button>
            <button
              type="button"
              disabled={deletingRow}
              onClick={() => setConfirming(false)}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Description</h2>
          {task.description ? (
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
              {task.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">No description added.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            <Paperclip size={12} />
            Attachments
          </h2>
          <div className="flex flex-col gap-3">
            <ResourceList resources={attachments} />
            {user && <ResourceForm userId={user.id} taskId={task.id} />}
          </div>
        </section>
      </div>
    </article>
  );
}
