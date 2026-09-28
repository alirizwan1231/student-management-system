"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { taskSchema, type TaskInput } from "@/lib/validation/task";
import { createTask } from "@/lib/db/repo/tasks";
import { useAllSubjects } from "@/hooks/useSubjects";

type FormValues = TaskInput & { subject_id?: string };

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/10";

const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300";

const errorClass = "mt-1.5 text-xs font-medium text-status-overdue";

const dropdownButtonClass =
  "flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-sm font-medium text-slate-900 outline-none transition-all duration-200 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/10";

const hiddenScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const dropdownMenuClass = `absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-white/[0.08] dark:bg-slate-900 dark:shadow-black/30 ${hiddenScrollbar}`;

const dropdownOptionClass =
  "flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors";

function ChevronDown() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true">
      <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M7 3v3M17 3v3M4.5 9.5h15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button type="button" onClick={() => setOpen((p) => !p)} className={dropdownButtonClass} aria-expanded={open}>
        <span className={selected ? "truncate" : "truncate text-slate-400 dark:text-slate-500"}>
          {selected?.label ?? placeholder ?? "Select"}
        </span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDown />
        </span>
      </button>

      {open && (
        <div className={dropdownMenuClass}>
          {options.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">No options available</div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`${dropdownOptionClass} ${
                    isSelected
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {isSelected && (
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400">
                      <path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function CompactSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold tabular-nums text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-200 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:ring-brand-500/10"
      >
        <span>{value}</span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDown />
        </span>
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+4px)] z-[60] max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 dark:border-white/[0.08] dark:bg-slate-900 dark:shadow-black/40 ${hiddenScrollbar}`}
        >
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <button
                type="button"
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12px] font-medium tabular-nums transition-colors ${
                  isSelected
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.05]"
                }`}
              >
                <span>{opt}</span>
                {isSelected && (
                  <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3 shrink-0 text-brand-600 dark:text-brand-400">
                    <path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function CustomDateTimePicker({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const parsedInitial = value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(parsedInitial);
  const [visibleMonth, setVisibleMonth] = useState<Date>(startOfMonth(parsedInitial));
  const [hour, setHour] = useState(value ? format(parsedInitial, "HH") : format(new Date(), "HH"));
  const [minute, setMinute] = useState(value ? format(parsedInitial, "mm") : "00");

  useEffect(() => {
    if (!value) {
      const now = new Date();
      setSelectedDate(now);
      setVisibleMonth(startOfMonth(now));
      setHour(format(now, "HH"));
      setMinute("00");
      return;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;
    setSelectedDate(parsed);
    setVisibleMonth(startOfMonth(parsed));
    setHour(format(parsed, "HH"));
    setMinute(format(parsed, "mm"));
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPlacement(spaceBelow < 480 ? "top" : "bottom");
  }, [open]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 }),
  });

  const push = (date: Date, h = hour, m = minute) => onChange(`${format(date, "yyyy-MM-dd")}T${h}:${m}`);

  const setToday = () => {
    const now = new Date();
    const h = format(now, "HH");
    const m = format(now, "mm");
    setSelectedDate(now);
    setVisibleMonth(startOfMonth(now));
    setHour(h);
    setMinute(m);
    push(now, h, m);
  };

  const displayValue = value ? format(new Date(value), "MMM d, yyyy • h:mm a") : "Select date & time";
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`${dropdownButtonClass} ${!value ? "text-slate-400 dark:text-slate-500" : ""}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={`shrink-0 ${value ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"}`}>
            <CalendarIcon />
          </span>
          <span className="truncate">{displayValue}</span>
        </span>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDown />
        </span>
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-white/[0.08] dark:bg-slate-900 dark:shadow-black/40 sm:max-w-[360px] ${hiddenScrollbar} ${
            placement === "bottom" ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-white/[0.07]">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{format(visibleMonth, "MMMM yyyy")}</p>
              <button
                type="button"
                onClick={setToday}
                className="mt-0.5 text-[11px] font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Today
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                aria-label="Previous month"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="m12.5 15-5-5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                aria-label="Next month"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="m7.5 15 5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 px-3 pt-3">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar */}
          <div className="grid grid-cols-7 gap-1 px-3 pb-3 pt-2">
            {days.map((day) => {
              const selected = isSameDay(day, selectedDate);
              const today = isToday(day);
              const inMonth = isSameMonth(day, visibleMonth);
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    push(day);
                  }}
                  className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    !inMonth
                      ? "text-slate-300 dark:text-slate-700"
                      : selected
                        ? "bg-brand-600 font-bold text-white shadow-sm shadow-brand-600/20"
                        : today
                          ? "bg-brand-50 font-bold text-brand-700 ring-1 ring-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  {format(day, "d")}
                  {today && !selected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-500" />}
                </button>
              );
            })}
          </div>

          {/* Time */}
          <div className="border-t border-slate-100 px-4 py-3.5 dark:border-white/[0.07]">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Time</span>
              <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                {hour}:{minute}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <CompactSelect
                value={hour}
                onChange={(h) => {
                  setHour(h);
                  push(selectedDate, h, minute);
                }}
                options={hours}
              />
              <CompactSelect
                value={minute}
                onChange={(m) => {
                  setMinute(m);
                  push(selectedDate, hour, m);
                }}
                options={minutes}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-slate-100 px-4 py-3 dark:border-white/[0.07]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.98] dark:bg-brand-500 dark:hover:bg-brand-400"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TaskForm({
  userId,
  subjectId,
  onCreated,
}: {
  userId: string;
  subjectId?: string;
  onCreated?: () => void;
}) {
  const showSubjectPicker = !subjectId;
  const subjects = useAllSubjects(showSubjectPicker ? userId : undefined);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { task_type: "assignment", priority: "medium", subject_id: "", deadline: "" },
  });

  const taskType = watch("task_type");
  const priority = watch("priority");
  const subjectValue = watch("subject_id");
  const deadlineValue = watch("deadline");

  const onSubmit = async (values: FormValues) => {
    const targetSubjectId = subjectId ?? values.subject_id;
    if (!targetSubjectId) return;
    await createTask(userId, { ...values, subject_id: targetSubjectId });
    reset({ task_type: "assignment", priority: "medium", subject_id: "", deadline: "" });
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
      {/* Intro */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-600 dark:text-brand-400">
            New task
          </span>
        </div>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Add an assignment, quiz, project, or other academic task to keep your schedule organized.
        </p>
      </div>

      <div className="space-y-6">
        {/* Subject */}
        {showSubjectPicker && (
          <div>
            <label className={labelClass}>Subject</label>
            <CustomSelect
              value={subjectValue ?? ""}
              onChange={(v) => setValue("subject_id", v, { shouldValidate: true })}
              placeholder="Select a subject"
              options={subjects.map((s) => ({ value: s.id, label: s.name }))}
            />
            {errors.subject_id && <p className={errorClass}>{errors.subject_id.message}</p>}
          </div>
        )}

        {/* Task Details */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path
                  d="M7 4.5h10A2.5 2.5 0 0 1 19.5 7v12.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Task details</h3>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Basic information about the task.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Title</label>
              <input placeholder="e.g. Database assignment" className={inputClass} {...register("title")} />
              {errors.title && <p className={errorClass}>{errors.title.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <CustomSelect
                value={taskType ?? "assignment"}
                onChange={(v) => setValue("task_type", v as FormValues["task_type"], { shouldValidate: true })}
                options={[
                  { value: "assignment", label: "Assignment" },
                  { value: "lab", label: "Lab" },
                  { value: "quiz", label: "Quiz" },
                  { value: "presentation", label: "Presentation" },
                  { value: "project", label: "Project" },
                  { value: "other", label: "Other" },
                ]}
              />
              {errors.task_type && <p className={errorClass}>{errors.task_type.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Priority</label>
              <CustomSelect
                value={priority ?? "medium"}
                onChange={(v) => setValue("priority", v as FormValues["priority"], { shouldValidate: true })}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
              {errors.priority && <p className={errorClass}>{errors.priority.message}</p>}
            </div>
          </div>
        </section>

        {/* Schedule */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <CalendarIcon />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Schedule & grading</h3>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Set the deadline and marks for this task.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Deadline</label>
              <CustomDateTimePicker
                value={deadlineValue}
                onChange={(v) => setValue("deadline", v, { shouldValidate: true })}
              />
              {errors.deadline && <p className={errorClass}>{errors.deadline.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Marks</label>
              <input type="number" min="0" placeholder="e.g. 20" className={inputClass} {...register("marks")} />
              {errors.marks && <p className={errorClass}>{errors.marks.message}</p>}
            </div>
          </div>
        </section>

        {/* Description */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M6 5h12M6 9h12M6 13h8M6 17h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Additional information</h3>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                Add notes or anything else you want to remember.
              </p>
            </div>
          </div>

          <label className={labelClass}>Description</label>
          <textarea
            rows={4}
            placeholder="Add any notes or additional details..."
            className={`${inputClass} resize-none leading-6`}
            {...register("description")}
          />
          {errors.description && <p className={errorClass}>{errors.description.message}</p>}
        </section>
      </div>

      {/* Submit */}
      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition-all duration-200 hover:-translate-y-[1px] hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Adding task...
            </>
          ) : (
            <>
              <span className="text-base leading-none transition-transform duration-200 group-hover:rotate-90">+</span>
              <span>Add task</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
