"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";

// The task form is one of the heaviest components in the app (form engine,
// validation, file staging). It is only needed after the user taps
// "Add task", so it loads as its own chunk on first open instead of riding
// in the initial bundle of every page that shows this button.
const TaskForm = dynamic(() => import("@/components/tasks/TaskForm").then((m) => m.TaskForm), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">Loading form...</p>,
});

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
