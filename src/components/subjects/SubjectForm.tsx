"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subjectSchema, type SubjectInput } from "@/lib/validation/subject";
import { createSubject, updateSubject } from "@/lib/db/repo/subjects";
import { findOrCreateLecturer } from "@/lib/db/repo/lecturers";
import { useSemesters } from "@/hooks/useSemesters";
import type { Subject } from "@/types/academic";

type FormValues = SubjectInput & { semester_id?: string };

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelClass = "mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400";

export function SubjectForm({
  userId,
  semesterId,
  subject,
  onCreated,
}: {
  userId: string;
  semesterId?: string;
  subject?: Subject;
  onCreated?: () => void;
}) {
  const isEdit = !!subject;
  const showSemesterPicker = !semesterId && !isEdit;
  const semesters = useSemesters(showSemesterPicker ? userId : undefined);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: subject?.name ?? "",
      code: subject?.code ?? "",
      lecturer_name: subject?.lecturer_name ?? "",
      credit_hours: subject?.credit_hours ?? undefined,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const lecturer = values.lecturer_name ? await findOrCreateLecturer(userId, values.lecturer_name) : null;

    if (isEdit && subject) {
      await updateSubject(subject.id, {
        ...values,
        lecturer_name: lecturer?.name ?? null,
        lecturer_id: lecturer?.id ?? null,
      });
    } else {
      const targetSemesterId = semesterId ?? values.semester_id;
      if (!targetSemesterId) return;
      await createSubject(userId, {
        ...values,
        semester_id: targetSemesterId,
        lecturer_name: lecturer?.name ?? null,
        lecturer_id: lecturer?.id ?? null,
      });
      reset();
    }
    onCreated?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {showSemesterPicker && (
          <div className="sm:col-span-2 md:col-span-4">
            <label className={labelClass}>Semester</label>
            <select required className={inputClass} {...register("semester_id")}>
              <option value="">Select a semester</option>
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={labelClass}>Name</label>
          <input placeholder="DBMS" className={inputClass} {...register("name")} />
          {errors.name && <p className="text-xs text-status-overdue">{errors.name.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Code</label>
          <input placeholder="CS301" className={inputClass} {...register("code")} />
        </div>
        <div>
          <label className={labelClass}>Instructor</label>
          <input placeholder="Dr. Ahmed" className={inputClass} {...register("lecturer_name")} />
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            Same name across subjects links to the same instructor page.
          </p>
        </div>
        <div>
          <label className={labelClass}>Credit hrs</label>
          <input type="number" step="0.5" className={inputClass} {...register("credit_hours")} />
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:self-start"
      >
        {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add subject"}
      </button>
    </form>
  );
}