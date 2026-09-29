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

import { semesterSchema, type SemesterInput } from "@/lib/validation/semester";
import { createSemester, updateSemester } from "@/lib/db/repo/semesters";
import type { Semester } from "@/types/academic";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-100 dark:placeholder:text-slate-600 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-white/[0.05] dark:focus:ring-brand-500/10";

const labelClass =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400";

const errorClass = "mt-1.5 text-[11px] font-medium text-status-overdue";

function ChevronDown() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-400">
      <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M7 3v3M17 3v3M4.5 9.5h15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CustomDatePicker({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const initialDate = value ? new Date(value) : new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [visibleMonth, setVisibleMonth] = useState<Date>(startOfMonth(initialDate));
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const calendarStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleSelect = (date: Date) => {
    setSelectedDate(date);
    onChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
  };

  const displayValue = value ? format(new Date(value), "MMM d, yyyy") : placeholder;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-sm font-medium outline-none transition-all hover:border-slate-300 hover:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05] dark:focus:border-brand-400 dark:focus:ring-brand-500/10 ${
          value ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className={value ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500"}>
            <CalendarIcon />
          </span>
          <span className="truncate">{displayValue}</span>
        </span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <ChevronDown />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-white/[0.08] dark:bg-slate-900 dark:shadow-black/40">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 dark:border-white/[0.07]">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{format(visibleMonth, "MMMM yyyy")}</p>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setSelectedDate(today);
                  setVisibleMonth(startOfMonth(today));
                  onChange(format(today, "yyyy-MM-dd"));
                  setOpen(false);
                }}
                className="mt-0.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                Today
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="m12.5 15-5-5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="m7.5 15 5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 px-3 pt-3">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
              <div key={day} className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pb-3 pt-2">
            {days.map((day) => {
              const selected = isSameDay(day, selectedDate);
              const today = isToday(day);
              const currentMonth = isSameMonth(day, visibleMonth);
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => handleSelect(day)}
                  className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    !currentMonth
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
        </div>
      )}
    </div>
  );
}

export function SemesterForm({
  userId,
  semester,
  onCreated,
}: {
  userId: string;
  semester?: Semester;
  onCreated?: () => void;
}) {
  const isEdit = !!semester;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SemesterInput>({
    resolver: zodResolver(semesterSchema),
    defaultValues: {
      name: semester?.name ?? "",
      number: semester?.number ?? undefined,
      start_date: semester?.start_date ?? "",
      end_date: semester?.end_date ?? "",
    },
  });

  const startDate = watch("start_date");
  const endDate = watch("end_date");

  const onSubmit = async (values: SemesterInput) => {
    if (isEdit && semester) {
      await updateSemester(semester.id, values);
    } else {
      await createSemester(userId, values);
      reset();
    }
    onCreated?.();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]"
    >
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700 dark:text-slate-300">
            {isEdit ? "Edit semester" : "Add semester"}
          </h3>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
          {isEdit ? "Update this semester's details." : "Create a semester and define its academic duration."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Name</label>
          <input placeholder="Semester 3" className={inputClass} {...register("name")} />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>

        <div>
          <label className={labelClass}>Number</label>
          <input type="number" min="1" placeholder="3" className={inputClass} {...register("number")} />
          {errors.number && <p className={errorClass}>{errors.number.message}</p>}
        </div>

        <div>
          <label className={labelClass}>Start date</label>
          <CustomDatePicker
            value={startDate}
            onChange={(value) => setValue("start_date", value, { shouldValidate: true })}
            placeholder="Select start date"
          />
          {errors.start_date && <p className={errorClass}>{errors.start_date.message}</p>}
        </div>

        <div>
          <label className={labelClass}>End date</label>
          <CustomDatePicker
            value={endDate}
            onChange={(value) => setValue("end_date", value, { shouldValidate: true })}
            placeholder="Select end date"
          />
          {errors.end_date && <p className={errorClass}>{errors.end_date.message}</p>}
        </div>
      </div>

      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4 dark:border-white/[0.06]">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add semester"}
        </button>
      </div>
    </form>
  );
}