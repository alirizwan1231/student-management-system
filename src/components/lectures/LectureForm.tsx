"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

import {
  lectureSchema,
  parseKeywords,
  type LectureInput,
} from "@/lib/validation/lecture";
import { createLecture } from "@/lib/db/repo/lectures";
import { createResource } from "@/lib/db/repo/resources";
import { queueFileUpload } from "@/lib/db/repo/pendingUploads";
import { inferResourceType } from "@/lib/utils/fileType";
import { useAllSubjects } from "@/hooks/useSubjects";

type FormValues = LectureInput & { subject_id?: string };

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/10";

const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300";

const errorClass =
  "mt-1.5 text-xs font-medium text-status-overdue";

const dropdownButtonClass =
  "flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-sm font-medium text-slate-900 outline-none transition-all duration-200 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/10";

const hiddenScrollbar =
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const dropdownMenuClass = `absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-white/[0.08] dark:bg-slate-900 dark:shadow-black/30 ${hiddenScrollbar}`;

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
        d="m5.5 7.5 4.5 4.5 4.5-4.5"
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
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () =>
      document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handler);

    return () =>
      document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        className={`${dropdownButtonClass} ${
          !selected
            ? "text-slate-400 dark:text-slate-500"
            : ""
        } ${
          hasError
            ? "border-status-overdue/60 focus:border-status-overdue"
            : ""
        }`}
      >
        <span className="truncate">
          {selected?.label ?? placeholder ?? "Select"}
        </span>

        <ChevronDown open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          className={dropdownMenuClass}
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
                  <span className="flex-1 truncate">
                    {option.label}
                  </span>

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

function PremiumDatePicker({
  value,
  onChange,
  hasError,
}: {
  value?: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const [month, setMonth] = useState(
    value ? new Date(`${value}T00:00:00`) : new Date()
  );

  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedDate = value
    ? new Date(`${value}T00:00:00`)
    : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () =>
      document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (value) {
      setMonth(new Date(`${value}T00:00:00`));
    }
  }, [value]);

  const firstDay = startOfWeek(startOfMonth(month), {
    weekStartsOn: 1,
  });

  const days = Array.from({ length: 42 }, (_, i) =>
    addDays(firstDay, i)
  );

  const selectDate = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"));
    setMonth(date);
    setOpen(false);
  };

  const setToday = () => {
    const today = new Date();

    onChange(format(today, "yyyy-MM-dd"));
    setMonth(today);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`${dropdownButtonClass} ${
          !value
            ? "text-slate-400 dark:text-slate-500"
            : ""
        } ${
          hasError
            ? "border-status-overdue/60 focus:border-status-overdue"
            : ""
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4 shrink-0 text-brand-500"
          >
            <rect
              x="4"
              y="5.5"
              width="16"
              height="15"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.7"
            />

            <path
              d="M8 3.5v4M16 3.5v4M4 10h16"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>

          <span className="truncate">
            {selectedDate
              ? format(selectedDate, "dd MMM yyyy")
              : "Select lecture date"}
          </span>
        </span>

        <ChevronDown open={open} />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+8px)] z-50 w-auto overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15 dark:border-white/[0.08] dark:bg-slate-900 dark:shadow-black/40 sm:max-w-[340px]`}
        >
          {/* Calendar header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setMonth(subMonths(month, 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4"
              >
                <path
                  d="m12.5 5-5 5 5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="text-center">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {format(month, "MMMM yyyy")}
              </p>
            </div>

            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setMonth(addMonths(month, 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4"
              >
                <path
                  d="m7.5 5 5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Weekdays */}
          <div className="mb-1 grid grid-cols-7">
            {["M", "T", "W", "T", "F", "S", "S"].map(
              (day, index) => (
                <div
                  key={`${day}-${index}`}
                  className="py-1.5 text-center text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500"
                >
                  {day}
                </div>
              )
            )}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const currentMonth = isSameMonth(
                day,
                month
              );

              const selected =
                selectedDate &&
                isSameDay(day, selectedDate);

              const today = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`relative flex h-9 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    !currentMonth
                      ? "text-slate-300 dark:text-slate-700"
                      : selected
                        ? "bg-brand-600 font-bold text-white shadow-sm dark:bg-brand-500"
                        : today
                          ? "bg-brand-50 font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  {format(day, "d")}

                  {today && !selected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={setToday}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LectureForm({
  userId,
  subjectId,
  onCreated,
}: {
  userId: string;
  subjectId?: string;
  onCreated?: () => void;
}) {
  const showSubjectPicker = !subjectId;

  const subjects = useAllSubjects(
    showSubjectPicker ? userId : undefined
  );

  const [slidesFile, setSlidesFile] =
    useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(lectureSchema),
    defaultValues: {
      subject_id: "",
    },
  });

  const subjectValue = watch("subject_id");
  const lectureDate = watch("lecture_date");

  const onSubmit = async (values: FormValues) => {
    const targetSubjectId =
      subjectId ?? values.subject_id;

    if (!targetSubjectId) return;

    const lecture = await createLecture(userId, {
      subject_id: targetSubjectId,
      lecture_number:
        values.lecture_number ?? null,
      title: values.title,
      lecture_date:
        values.lecture_date ?? null,
      detailed_notes:
        values.detailed_notes ?? null,
      short_summary:
        values.short_summary ?? null,
      keywords: parseKeywords(values.keywordsRaw),
    });

    if (slidesFile) {
      const resource = await createResource(userId, {
        lecture_id: lecture.id,
        title: slidesFile.name,
        resource_type: inferResourceType(
          slidesFile.name
        ),
      });

      await queueFileUpload(
        userId,
        resource.id,
        slidesFile
      );
    }

    reset({
      subject_id: "",
    });

    setSlidesFile(null);

    onCreated?.();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      {/* Lecture details */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
            >
              <path
                d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />

              <path
                d="M8 8h6M8 11h6M8 14h4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />

              <path
                d="M18 19.5h-11"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Lecture details
            </h3>

            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Add the basic information for this lecture.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {/* Subject */}
          {showSubjectPicker && (
            <div className="sm:col-span-2 md:col-span-4">
              <label className={labelClass}>
                Subject
              </label>

              <CustomSelect
                value={subjectValue ?? ""}
                onChange={(v) =>
                  setValue("subject_id", v, {
                    shouldValidate: true,
                  })
                }
                placeholder="Select a subject"
                hasError={!!errors.subject_id}
                options={subjects.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
              />

              <input
                type="hidden"
                {...register("subject_id")}
              />

              {errors.subject_id && (
                <p className={errorClass}>
                  {errors.subject_id.message}
                </p>
              )}
            </div>
          )}

          {/* Lecture number */}
          <div>
            <label className={labelClass}>
              Lecture #
            </label>

            <input
              type="number"
              min="1"
              placeholder="01"
              className={inputClass}
              {...register("lecture_number")}
            />

            {errors.lecture_number && (
              <p className={errorClass}>
                {errors.lecture_number.message}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Title
            </label>

            <input
              placeholder="Introduction to Database Systems"
              className={inputClass}
              {...register("title")}
            />

            {errors.title && (
              <p className={errorClass}>
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>
              Date
            </label>

            <PremiumDatePicker
              value={lectureDate ?? ""}
              onChange={(value) =>
                setValue("lecture_date", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              hasError={!!errors.lecture_date}
            />

            <input
              type="hidden"
              {...register("lecture_date")}
            />

            {errors.lecture_date && (
              <p className={errorClass}>
                {errors.lecture_date.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detailed notes */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        <label className={labelClass}>
          Detailed notes
        </label>

        <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
          Add complete notes, explanations, examples or important points.
        </p>

        <textarea
          rows={6}
          placeholder="Write your lecture notes here..."
          className={`${inputClass} resize-y leading-6`}
          {...register("detailed_notes")}
        />

        {errors.detailed_notes && (
          <p className={errorClass}>
            {errors.detailed_notes.message}
          </p>
        )}
      </div>

      {/* Quick recall */}
      <div className="overflow-hidden rounded-2xl border border-brand-200/80 bg-brand-50/50 shadow-sm dark:border-brand-500/15 dark:bg-brand-500/[0.045]">
        <div className="border-b border-brand-100/80 px-5 py-4 dark:border-brand-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
              >
                <path
                  d="M12 3.5a7 7 0 0 0-4 12.74V19h8v-2.76A7 7 0 0 0 12 3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />

                <path
                  d="M9.5 22h5M9 19h6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <h3 className="text-sm font-bold text-brand-800 dark:text-brand-200">
                Quick recall
              </h3>

              <p className="mt-0.5 text-xs text-brand-600/70 dark:text-brand-300/60">
                Keep the key ideas easy to review later.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {/* Summary */}
          <div>
            <label className={labelClass}>
              Short summary
            </label>

            <textarea
              rows={3}
              placeholder="Summarize this lecture in a few sentences..."
              className={`${inputClass} resize-y bg-white/80 leading-6 dark:bg-slate-900/60`}
              {...register("short_summary")}
            />

            {errors.short_summary && (
              <p className={errorClass}>
                {errors.short_summary.message}
              </p>
            )}
          </div>

          {/* Keywords */}
          <div>
            <label className={labelClass}>
              Keywords / key points
            </label>

            <input
              placeholder="DBMS, Primary Key, Foreign Key"
              className={`${inputClass} bg-white/80 dark:bg-slate-900/60`}
              {...register("keywordsRaw")}
            />

            <p className="mt-1.5 text-[11px] text-brand-600/70 dark:text-brand-300/60">
              Separate multiple keywords with commas.
            </p>

            {errors.keywordsRaw && (
              <p className={errorClass}>
                {errors.keywordsRaw.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* File upload */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        <div className="mb-4">
          <label className={labelClass}>
            Slides / notes file
          </label>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Optional. PDF, PowerPoint, Word documents and images are supported.
          </p>
        </div>

        <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-7 text-center transition-all duration-200 hover:border-brand-300 hover:bg-brand-50/50 dark:border-white/[0.1] dark:bg-white/[0.02] dark:hover:border-brand-500/30 dark:hover:bg-brand-500/[0.04]">
          <input
            type="file"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg"
            className="sr-only"
            onChange={(e) =>
              setSlidesFile(
                e.target.files?.[0] ?? null
              )
            }
          />

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:text-brand-600 dark:bg-white/[0.05] dark:text-slate-400 dark:ring-white/[0.08] dark:group-hover:text-brand-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
            >
              <path
                d="M12 16V4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="m7.5 8.5 4.5-4.5 4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {slidesFile
              ? "Change selected file"
              : "Choose a file"}
          </p>

          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Click to browse from your device
          </p>
        </label>

        {slidesFile && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3 dark:border-brand-500/15 dark:bg-brand-500/[0.06]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm dark:bg-brand-500/10 dark:text-brand-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
              >
                <path
                  d="M7 3.5h7l4 4V20.5H7A2.5 2.5 0 0 1 4.5 18V6A2.5 2.5 0 0 1 7 3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />

                <path
                  d="M14 3.5v4h4M8 12h8M8 15h6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                {slidesFile.name}
              </p>

              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {(slidesFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-brand-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400 sm:w-auto sm:self-start"
      >
        {isSubmitting ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
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

            Adding lecture...
          </>
        ) : (
          <>
            <span className="text-base leading-none transition-transform duration-200 group-hover:rotate-90">
              +
            </span>

            <span>Add lecture</span>
          </>
        )}
      </button>
    </form>
  );
}
