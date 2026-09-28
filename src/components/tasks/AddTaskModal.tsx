"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { TaskForm } from "@/components/tasks/TaskForm";
import { cn } from "@/lib/utils/cn";

export function AddTaskModal({
  userId,
  fullWidth,
}: {
  userId: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group inline-flex items-center justify-center gap-2 rounded-xl",
          "bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white",
          "shadow-sm shadow-brand-600/20",
          "transition-all duration-200",
          "hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/20",
          "active:translate-y-0 active:scale-[0.98]",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2",
          "dark:focus:ring-offset-slate-950",
          fullWidth && "w-full"
        )}
      >
        <span className="grid h-5 w-5 place-items-center rounded-md bg-white/15 text-base leading-none transition-transform duration-200 group-hover:rotate-90">
          +
        </span>

        <span>Add task</span>
      </button>

      {open && (
        <Modal title="Add a task" onClose={() => setOpen(false)}>
          <TaskForm
            userId={userId}
            onCreated={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}
