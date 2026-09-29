"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, BookOpen, FileText, Layers, Loader2, Paperclip, Save, Tag, X } from "lucide-react";
import { notesSchema, type NotesInput } from "@/lib/validation/notes";
import { createLecture, updateLecture } from "@/lib/db/repo/lectures";
import { createResource } from "@/lib/db/repo/resources";
import { queueFileUpload } from "@/lib/db/repo/pendingUploads";
import { inferResourceType } from "@/lib/utils/fileType";
import { padLectureNumber } from "@/lib/utils/notes";
import { useSemesters } from "@/hooks/useSemesters";
import { useAllSubjects } from "@/hooks/useSubjects";
import { useLectures } from "@/hooks/useLectures";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { KeywordInput } from "@/components/notes/KeywordInput";
import { NotesAttachments } from "@/components/notes/NotesAttachments";
import type { Lecture } from "@/types/academic";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/[0.14] dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-500/10";

const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300";

const errorClass = "mt-1.5 text-xs font-medium text-status-overdue";

const cardClass =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-6";

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <Icon size={16} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// One form for both "Add notes" and "Edit notes".
// Flow: Semester -> Subject -> Lecture number -> Title -> Notes -> Summary
// -> Keywords -> Attachments. The date is optional metadata, not a schedule.
export function NotesForm({
  userId,
  initialSubjectId,
  lecture,
}: {
  userId: string;
  initialSubjectId?: string;
  lecture?: Lecture;
}) {
  const router = useRouter();
  const isEdit = !!lecture;

  const semesters = useSemesters(userId);
  const allSubjects = useAllSubjects(userId);

  const wantedSubjectId = lecture?.subject_id ?? initialSubjectId ?? "";

  const [semesterId, setSemesterId] = useState("");
  const [keywords, setKeywords] = useState<string[]>(lecture?.keywords ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<NotesInput>({
    resolver: zodResolver(notesSchema),
    defaultValues: {
      subject_id: wantedSubjectId,
      lecture_number: lecture?.lecture_number ?? undefined,
      title: lecture?.title ?? "",
      lecture_date: lecture?.lecture_date ?? "",
      detailed_notes: lecture?.detailed_notes ?? "",
      short_summary: lecture?.short_summary ?? "",
    },
  });

  // Pick the starting semester: the one owning the requested subject, else
  // the active semester, else the first one.
  useEffect(() => {
    if (semesterId || semesters.length === 0) return;
    const wanted = allSubjects.find((s) => s.id === wantedSubjectId);
    if (wantedSubjectId && !wanted && allSubjects.length === 0) return;
    setSemesterId(wanted?.semester_id ?? semesters.find((s) => s.is_active)?.id ?? semesters[0].id);
  }, [semesterId, semesters, allSubjects, wantedSubjectId]);

  const subjectValue = watch("subject_id");
  const numberValue = watch("lecture_number");

  const subjectOptions = useMemo(
    () =>
      allSubjects
        .filter((s) => s.semester_id === semesterId)
        .map((s) => ({ value: s.id, label: s.name, hint: s.code ?? undefined })),
    [allSubjects, semesterId]
  );

  const semesterOptions = useMemo(
    () => semesters.map((s) => ({ value: s.id, label: s.name, hint: s.is_active ? "Active" : undefined })),
    [semesters]
  );

  const handleSemesterChange = (id: string) => {
    setSemesterId(id);
    const current = getValues("subject_id");
    if (current && !allSubjects.some((s) => s.id === current && s.semester_id === id)) {
      setValue("subject_id", "");
    }
  };

  // Lecture numbers already used by this subject (excluding the notes being edited).
  const subjectLectures = useLectures(subjectValue || undefined);
  const otherLectures = useMemo(
    () => subjectLectures.filter((l) => l.id !== lecture?.id),
    [subjectLectures, lecture?.id]
  );
  const usedNumbers = useMemo(
    () => otherLectures.map((l) => l.lecture_number).filter((n): n is number => typeof n === "number"),
    [otherLectures]
  );
  const nextNumber = usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1;

  const enteredNumber = Number(numberValue);
  const duplicate =
    subjectValue && Number.isFinite(enteredNumber) && enteredNumber > 0
      ? otherLectures.find((l) => l.lecture_number === enteredNumber)
      : undefined;

  // Suggest the next free number until the user types their own.
  useEffect(() => {
    if (isEdit || !subjectValue || dirtyFields.lecture_number) return;
    setValue("lecture_number", nextNumber);
  }, [isEdit, subjectValue, nextNumber, dirtyFields.lecture_number, setValue]);

  useEffect(() => {
    if (!duplicate) setAllowDuplicate(false);
  }, [duplicate]);

  const onSubmit = async (values: NotesInput) => {
    setSubmitError(null);

    if (duplicate && !allowDuplicate) {
      setSubmitError(
        `Lecture ${padLectureNumber(values.lecture_number)} already has notes for this subject. Open them, choose another number, or tick the box to save another entry anyway.`
      );
      return;
    }

    try {
      const fields = {
        lecture_number: values.lecture_number,
        title: values.title.trim(),
        lecture_date: values.lecture_date || null,
        detailed_notes: values.detailed_notes?.trim() || null,
        short_summary: values.short_summary?.trim() || null,
        keywords,
      };

      let lectureId: string;
      if (lecture) {
        await updateLecture(lecture.id, fields);
        lectureId = lecture.id;
      } else {
        const created = await createLecture(userId, { subject_id: values.subject_id, ...fields });
        lectureId = created.id;
      }

      for (const file of files) {
        const resource = await createResource(userId, {
          lecture_id: lectureId,
          title: file.name,
          resource_type: inferResourceType(file.name),
        });
        await queueFileUpload(userId, resource.id, file);
      }

      router.push(`/notes/lecture/${lectureId}`);
    } catch {
      setSubmitError("Couldn't save your notes. Please try again.");
    }
  };

  const noSemesters = semesters.length === 0;
  const noSubjectsInSemester = !noSemesters && !!semesterId && subjectOptions.length === 0;
  const cancelHref = lecture
    ? `/notes/lecture/${lecture.id}`
    : initialSubjectId
      ? `/notes/subject/${initialSubjectId}`
      : "/notes";
  const notesLength = (watch("detailed_notes") ?? "").length;
  const lockedSubject = allSubjects.find((s) => s.id === subjectValue);
  const lockedSemester = semesters.find((s) => s.id === lockedSubject?.semester_id);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* 1. Where do these notes belong */}
      <section className={cardClass}>
        <SectionHeader
          icon={Layers}
          title="Where do these notes belong?"
          description="Choose the semester, the subject and the lecture number."
        />

        {noSemesters ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center dark:border-white/[0.12]">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Create a semester and a subject first</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Notes are saved under a subject, and subjects live inside a semester.
            </p>
            <Link
              href="/semesters"
              className="mt-3 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Go to semesters
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isEdit ? (
              <>
                <div>
                  <span className={labelClass}>Semester</span>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-300">
                    {lockedSemester?.name ?? "—"}
                  </div>
                </div>
                <div>
                  <span className={labelClass}>Subject</span>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-medium text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-300">
                    {lockedSubject?.name ?? "—"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className={labelClass}>Semester</span>
                  <SearchableSelect
                    value={semesterId}
                    onChange={handleSemesterChange}
                    options={semesterOptions}
                    placeholder="Select a semester"
                    searchPlaceholder="Search semesters..."
                  />
                </div>

                <div>
                  <span className={labelClass}>Subject</span>
                  <SearchableSelect
                    value={subjectValue ?? ""}
                    onChange={(v) => setValue("subject_id", v, { shouldValidate: true })}
                    options={subjectOptions}
                    placeholder={noSubjectsInSemester ? "No subjects in this semester" : "Select a subject"}
                    searchPlaceholder="Search subjects..."
                    emptyText="No subjects in this semester"
                    hasError={!!errors.subject_id}
                  />
                  <input type="hidden" {...register("subject_id")} />
                  {errors.subject_id && <p className={errorClass}>{errors.subject_id.message}</p>}
                  {noSubjectsInSemester && (
                    <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <Link href={`/semesters/${semesterId}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                        Add a subject
                      </Link>{" "}
                      to this semester first.
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="lecture_number" className={labelClass}>
                Lecture number
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  id="lecture_number"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="e.g. 4"
                  className={`${inputClass} sm:max-w-[180px]`}
                  {...register("lecture_number")}
                />
                {subjectValue && !isEdit && Number(numberValue) !== nextNumber && (
                  <button
                    type="button"
                    onClick={() => setValue("lecture_number", nextNumber, { shouldValidate: true })}
                    className="self-start rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                  >
                    Use next number ({padLectureNumber(nextNumber)})
                  </button>
                )}
              </div>
              {errors.lecture_number && <p className={errorClass}>{errors.lecture_number.message}</p>}
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                {!subjectValue
                  ? "Select a subject first."
                  : usedNumbers.length > 0
                    ? `Already added for this subject: ${[...usedNumbers].sort((a, b) => a - b).map(padLectureNumber).join(", ")}`
                    : "No notes for this subject yet — this will be your first."}
              </p>

              {duplicate && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="min-w-0 text-xs leading-5 text-amber-800 dark:text-amber-200">
                      <p className="font-semibold">
                        Lecture {padLectureNumber(duplicate.lecture_number)} already exists: &ldquo;{duplicate.title}&rdquo;
                      </p>
                      <p className="mt-0.5">Saving would create a second entry with the same number.</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <Link href={`/notes/lecture/${duplicate.id}`} className="font-semibold text-amber-900 underline dark:text-amber-100">
                          Open existing notes
                        </Link>
                        <label className="flex cursor-pointer items-center gap-2 font-medium">
                          <input
                            type="checkbox"
                            checked={allowDuplicate}
                            onChange={(e) => setAllowDuplicate(e.target.checked)}
                            className="h-4 w-4 rounded border-amber-400 accent-amber-600"
                          />
                          Save it anyway
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 2. Notes */}
      <section className={cardClass}>
        <SectionHeader icon={BookOpen} title="Your notes" description="Write down everything you learned in this lecture." />

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className={labelClass}>
              Notes title
            </label>
            <input
              id="title"
              placeholder="Introduction to Object Oriented Programming"
              className={inputClass}
              {...register("title")}
            />
            {errors.title && <p className={errorClass}>{errors.title.message}</p>}
          </div>

          <div>
            <div className="mb-1.5 flex items-end justify-between">
              <label htmlFor="detailed_notes" className="text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
                Notes
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">{notesLength.toLocaleString()} characters</span>
            </div>
            <textarea
              id="detailed_notes"
              rows={14}
              placeholder={"Concepts explained by the teacher, definitions, examples, code snippets, important points, questions discussed in class..."}
              className={`${inputClass} min-h-[280px] resize-y leading-7`}
              {...register("detailed_notes")}
            />
          </div>
        </div>
      </section>

      {/* 3. Quick recall */}
      <section className="rounded-2xl border border-brand-200/80 bg-brand-50/50 p-5 shadow-sm dark:border-brand-500/15 dark:bg-brand-500/[0.045] sm:p-6">
        <SectionHeader icon={Tag} title="Quick recall" description="A short summary and keywords help you remember the lecture at a glance." />

        <div className="space-y-4">
          <div>
            <label htmlFor="short_summary" className={labelClass}>
              Quick summary
            </label>
            <textarea
              id="short_summary"
              rows={3}
              placeholder="This lecture introduced classes, objects, constructors and encapsulation."
              className={`${inputClass} resize-y bg-white/80 leading-6 dark:bg-slate-900/60`}
              {...register("short_summary")}
            />
          </div>

          <div>
            <span className={labelClass}>Keywords</span>
            <KeywordInput value={keywords} onChange={setKeywords} />
            <p className="mt-1.5 text-[11px] text-brand-700/70 dark:text-brand-300/60">
              Press Enter or comma to add a keyword. Click the &times; on a keyword to remove it.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Attachments */}
      <section className={cardClass}>
        <SectionHeader
          icon={Paperclip}
          title="Attachments"
          description="Optional — slides, PDFs, images or material from your teacher."
        />

        {isEdit && lecture ? (
          <NotesAttachments lectureId={lecture.id} editable />
        ) : (
          <div className="space-y-3">
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-7 text-center transition-all duration-200 hover:border-brand-300 hover:bg-brand-50/50 dark:border-white/[0.1] dark:bg-white/[0.02] dark:hover:border-brand-500/30 dark:hover:bg-brand-500/[0.04]">
              <input
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg"
                className="sr-only"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  if (picked.length) setFiles((prev) => [...prev, ...picked]);
                  e.target.value = "";
                }}
              />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:text-brand-600 dark:bg-white/[0.05] dark:text-slate-400 dark:ring-white/[0.08] dark:group-hover:text-brand-400">
                <Paperclip size={18} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Choose files to attach</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">PDF, PowerPoint, Word or images</p>
            </label>

            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 dark:border-brand-500/15 dark:bg-brand-500/[0.06]"
                  >
                    <FileText size={16} className="shrink-0 text-brand-600 dark:text-brand-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{formatSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                      aria-label={`Remove ${file.name}`}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-rose-500 dark:hover:bg-white/[0.06]"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* 5. Optional details */}
      <section className={cardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="lecture_date" className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Class date <span className="font-medium text-slate-400 dark:text-slate-500">(optional)</span>
            </label>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Just for your own reference. Notes are organised by subject and lecture number, not by date.
            </p>
          </div>
          <input
            id="lecture_date"
            type="date"
            className={`${inputClass} sm:max-w-[190px] [color-scheme:light] dark:[color-scheme:dark]`}
            {...register("lecture_date")}
          />
        </div>
      </section>

      {submitError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/15 dark:bg-rose-500/[0.06]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-500" />
          <p className="text-xs font-medium leading-5 text-rose-600 dark:text-rose-400">{submitError}</p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.04]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || noSemesters}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition-all duration-200 hover:-translate-y-[1px] hover:bg-brand-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Save notes"}
        </button>
      </div>
    </form>
  );
}
