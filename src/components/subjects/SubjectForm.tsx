"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subjectSchema, type SubjectInput } from "@/lib/validation/subject";
import { createSubject } from "@/lib/db/repo/subjects";
import { useSemesters } from "@/hooks/useSemesters";

type FormValues = SubjectInput & { semester_id?: string };

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/10";

const selectTriggerClass =
  "flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-sm font-medium text-slate-900 outline-none transition-all duration-200 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/10";

const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300";

const errorClass = "mt-1.5 text-xs font-medium text-status-overdue";

const hiddenScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function ChevronDown({ open }: { open?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden="true"
    >
      <path
        d="m5 7.5 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  hasError,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`${selectTriggerClass} ${
          !selected ? "text-slate-400 dark:text-slate-500" : ""
        } ${hasError ? "border-status-overdue/60 focus:border-status-overdue" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">
          {selected?.label ?? placeholder ?? "Select"}
        </span>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 dark:border-white/[0.08] dark:bg-slate-900 dark:shadow-black/30 ${hiddenScrollbar}`}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  type="button"
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium leading-tight transition-colors ${
                    isSelected
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {isSelected && (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400"
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
            })
          )}
        </div>
      )}
    </div>
  );
}

export function SubjectForm({
  userId,
  semesterId,
  onCreated,
}: {
  userId: string;
  semesterId?: string;
  onCreated?: () => void;
}) {
  const showSemesterPicker = !semesterId;
  const semesters = useSemesters(showSemesterPicker ? userId : undefined);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { semester_id: "" },
  });

  const semesterValue = watch("semester_id");

  const onSubmit = async (values: FormValues) => {
    const targetSemesterId = semesterId ?? values.semester_id;
    if (!targetSemesterId) return;

    await createSubject(userId, { ...values, semester_id: targetSemesterId });
    reset({ semester_id: "" });
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {showSemesterPicker && (
          <div className="sm:col-span-2 md:col-span-4">
            <label className={labelClass}>Semester</label>

            <CustomSelect
              value={semesterValue ?? ""}
              onChange={(v) =>
                setValue("semester_id", v, { shouldValidate: true })
              }
              placeholder="Select a semester"
              hasError={!!errors.semester_id}
              options={semesters.map((s) => ({ value: s.id, label: s.name }))}
            />

            <input type="hidden" {...register("semester_id")} />

            {errors.semester_id && (
              <p className={errorClass}>{errors.semester_id.message}</p>
            )}
          </div>
        )}

        <div>
          <label className={labelClass}>Name</label>
          <input placeholder="DBMS" className={inputClass} {...register("name")} />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>

        <div>
          <label className={labelClass}>Code</label>
          <input placeholder="CS301" className={inputClass} {...register("code")} />
          {errors.code && <p className={errorClass}>{errors.code.message}</p>}
        </div>

        <div>
          <label className={labelClass}>Lecturer</label>
          <input
            placeholder="Dr. Ahmed"
            className={inputClass}
            {...register("lecturer_name")}
          />
          {errors.lecturer_name && (
            <p className={errorClass}>{errors.lecturer_name.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Credit hours</label>
          <input
            type="number"
            step="0.5"
            min="0"
            placeholder="3"
            className={inputClass}
            {...register("credit_hours")}
          />
          {errors.credit_hours && (
            <p className={errorClass}>{errors.credit_hours.message}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-brand-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400 sm:w-auto sm:self-start"
      >
        {isSubmitting ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
                className="opacity-30"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Adding...
          </>
        ) : (
          <>
            <span className="text-base leading-none transition-transform duration-200 group-hover:rotate-90">
              +
            </span>
            <span>Add subject</span>
          </>
        )}
      </button>
    </form>
  );
}
