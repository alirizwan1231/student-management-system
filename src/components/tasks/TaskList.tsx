"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { setTaskStatus, deleteTask } from "@/lib/db/repo/tasks";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";

function isOverdue(deadline?: string | null) {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline?: string | null;
  task_type?: string | null;
  description?: string | null;
};

const statusOptions = [
  { value: "pending", label: "Pending", dot: "bg-slate-400" },
  { value: "in_progress", label: "In Progress", dot: "bg-blue-500" },
  { value: "completed", label: "Completed", dot: "bg-emerald-500" },
];

function StatusDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selected =
    statusOptions.find((option) => option.value === value) ?? statusOptions[0];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-w-[145px] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 outline-none transition-all hover:border-slate-300 hover:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05] dark:focus:border-brand-400 dark:focus:ring-brand-500/10"
      >
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${selected.dot}`} />
          <span>{selected.label}</span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="m6 8 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 min-w-[170px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-white/[0.08] dark:bg-slate-900 dark:shadow-black/30">
          {statusOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors ${
                  isSelected
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.05]"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${option.dot}`} />
                <span className="flex-1">{option.label}</span>
                {isSelected && (
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400"
                  >
                    <path
                      d="m5 10 3 3 7-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TaskList({
  tasks,
  onChanged,
}: {
  tasks: Task[];
  onChanged?: () => void;
}) {
  if (!tasks.length) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No tasks yet
        </h3>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400 dark:text-slate-500">
          Add your first task to start organizing your academic schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const overdue =
          task.deadline && task.status !== "completed"
            ? isOverdue(task.deadline)
            : false;

        const effectiveStatus = overdue ? "overdue" : task.status;

        return (
          <div
            key={task.id}
            className="group relative overflow-visible rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-white/[0.12]"
          >
            {/* Left Status Accent */}
            <div
              className={`absolute bottom-4 left-0 top-4 w-1 rounded-r-full ${
                effectiveStatus === "completed"
                  ? "bg-emerald-500"
                  : effectiveStatus === "overdue"
                    ? "bg-red-500"
                    : effectiveStatus === "in_progress"
                      ? "bg-blue-500"
                      : "bg-slate-300 dark:bg-slate-600"
              }`}
            />

            {/* Delete — absolutely positioned, no layout space */}
            <button
              type="button"
              onClick={async () => {
                await deleteTask(task.id);
                onChanged?.();
              }}
              className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-slate-300 opacity-100 transition-all hover:bg-red-50 hover:text-red-500 sm:right-3 sm:top-3 sm:p-2 sm:opacity-0 sm:group-hover:opacity-100 dark:text-slate-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              aria-label="Delete task"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path
                  d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="pl-3">
              {/* Top Row — title + description + badges (right pad for delete btn) */}
              <div className="pr-8 sm:pr-10">
                <Link href={`/tasks/${task.id}`}>
                  <h3
                    className={`text-sm font-bold leading-5 transition-colors hover:text-brand-600 dark:hover:text-brand-400 ${
                      task.status === "completed"
                        ? "text-slate-400 line-through dark:text-slate-500"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {task.title}
                  </h3>
                </Link>

                {task.description && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {task.description}
                  </p>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <TaskStatusBadge status={effectiveStatus} />
                  <TaskPriorityBadge priority={task.priority} />
                  {task.task_type && (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold capitalize text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
                      {task.task_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Row — deadline + status dropdown */}
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`h-4 w-4 ${
                      overdue
                        ? "text-red-500"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    <path
                      d="M7 3v3M17 3v3M4.5 9.5h15"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <rect
                      x="4"
                      y="5"
                      width="16"
                      height="15"
                      rx="2.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>

                  <span
                    className={
                      overdue
                        ? "font-semibold text-red-500"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  >
                    {task.deadline
                      ? new Date(task.deadline).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "No deadline"}
                  </span>
                </div>

                <StatusDropdown
                  value={task.status}
                  onChange={async (status) => {
                    await setTaskStatus(task.id, status);
                    onChanged?.();
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
