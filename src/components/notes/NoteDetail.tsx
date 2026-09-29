"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight, Loader2, Paperclip, Pencil, Trash2 } from "lucide-react";
import { useSubject } from "@/hooks/useSubjects";
import { useLectures } from "@/hooks/useLectures";
import { useLectureResources } from "@/hooks/useResources";
import { useLectureOrNull } from "@/hooks/useNotes";
import { deleteNote } from "@/lib/db/repo/notes";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { NotesAttachments } from "@/components/notes/NotesAttachments";
import { lectureLabel, padLectureNumber } from "@/lib/utils/notes";

// Read view of one lecture's notes: summary, keywords, full notes, files.
export function NoteDetail({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const lecture = useLectureOrNull(lectureId);
  const subject = useSubject(lecture?.subject_id);
  const siblings = useLectures(lecture?.subject_id);
  const attachments = useLectureResources(lectureId);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (lecture === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-56 animate-pulse rounded bg-slate-200 dark:bg-white/[0.06]" />
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
      </div>
    );
  }

  if (lecture === null) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-white/[0.12]">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">These notes could not be found.</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">They may have been deleted.</p>
        <Link href="/notes" className="mt-3 inline-flex text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Back to Notes
        </Link>
      </div>
    );
  }

  const index = siblings.findIndex((l) => l.id === lecture.id);
  const previous = index > 0 ? siblings[index - 1] : undefined;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined;

  const handleDelete = async () => {
    setDeleting(true);
    await deleteNote(lecture.id);
    router.replace(`/notes/subject/${lecture.subject_id}`);
  };

  return (
    <article>
      <Breadcrumbs
        items={[
          { label: "Notes", href: "/notes" },
          { label: subject?.name ?? "Subject", href: `/notes/subject/${lecture.subject_id}` },
          { label: lectureLabel(lecture.lecture_number) },
        ]}
      />

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject?.color || "#3366ff" }} />
            {subject?.name ?? "Subject"}
          </span>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            {lectureLabel(lecture.lecture_number)}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="break-words font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {lecture.title}
            </h1>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {lecture.lecture_date ? `Class date ${format(new Date(`${lecture.lecture_date}T00:00:00`), "d MMM yyyy")} \u2022 ` : ""}
              Last updated {format(new Date(lecture.updated_at), "d MMM yyyy, h:mm a")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/notes/lecture/${lecture.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06]"
            >
              <Pencil size={13} />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-rose-500/20 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>
      </header>

      {confirming && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/[0.06]">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Delete these notes?</p>
          <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80">
            &ldquo;{lecture.title}&rdquo; will be removed
            {attachments.length > 0 ? ` along with ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}` : ""}. This can&apos;t be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {deleting && <Loader2 size={13} className="animate-spin" />}
              Yes, delete
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirming(false)}
              className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {(lecture.short_summary || lecture.keywords.length > 0) && (
          <section className="rounded-2xl border border-brand-200/80 bg-brand-50/50 p-5 dark:border-brand-500/15 dark:bg-brand-500/[0.045] sm:p-6">
            {lecture.short_summary && (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-700 dark:text-brand-300">Summary</h2>
                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">{lecture.short_summary}</p>
              </div>
            )}
            {lecture.keywords.length > 0 && (
              <div className={lecture.short_summary ? "mt-5" : ""}>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-700 dark:text-brand-300">Keywords</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lecture.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Notes</h2>
          {lecture.detailed_notes ? (
            <div className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700 dark:text-slate-200">
              {lecture.detailed_notes}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
              No detailed notes written yet.{" "}
              <Link href={`/notes/lecture/${lecture.id}/edit`} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                Add them
              </Link>
              .
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            <Paperclip size={12} />
            Attachments
          </h2>
          <NotesAttachments lectureId={lecture.id} editable />
        </section>
      </div>

      {(previous || next) && (
        <nav aria-label="Other lectures" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {previous ? (
            <Link
              href={`/notes/lecture/${previous.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]"
            >
              <ArrowLeft size={16} className="shrink-0 text-slate-400 transition-transform group-hover:-translate-x-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Previous &bull; Lecture {padLectureNumber(previous.lecture_number)}</p>
                <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{previous.title}</p>
              </div>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/notes/lecture/${next.id}`}
              className="group flex items-center justify-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-right transition-all hover:border-slate-300 hover:shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next &bull; Lecture {padLectureNumber(next.lecture_number)}</p>
                <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{next.title}</p>
              </div>
              <ArrowRight size={16} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
