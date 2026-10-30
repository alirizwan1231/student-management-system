"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useTask } from "@/hooks/useTasks";
import { cn } from "@/lib/utils/cn";

// Same lazy chunk as AddTaskModal: the form only loads when editing starts.
const TaskForm = dynamic(() => import("@/components/tasks/TaskForm").then((m) => m.TaskForm), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">Loading form...</p>,
});

// Edit button + modal for an existing task. The task is read fresh from
// the local DB when the modal opens, so the form always starts from the
// latest saved values (title, deadline, marks, attached notes).
export function EditTaskModal({
  userId,
  taskId,
  variant = "button",
}: {
  userId: string;
  taskId: string;
  variant?: "button" | "chip";
}) {
  const [open, setOpen] = useState(false);
  const task = useTask(open ? taskId : undefined);

  return (
    <>
      {variant === "button" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06]"
        >
          <Pencil size={13} />
          Edit
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-all",
            "hover:border-slate-300 hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05]"
          )}
        >
          <Pencil size={13} />
          Edit
        </button>
      )}

      {open && (
        <Modal title="Edit task" onClose={() => setOpen(false)}>
          {task === undefined ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">Loading...</p>
          ) : task === null ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">This task could not be found.</p>
          ) : (
            <TaskForm userId={userId} task={task} onSaved={() => setOpen(false)} />
          )}
        </Modal>
      )}
    </>
  );
}
