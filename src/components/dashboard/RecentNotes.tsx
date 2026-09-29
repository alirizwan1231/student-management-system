"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, NotebookPen } from "lucide-react";
import { useRecentNotes } from "@/hooks/useNotes";
import { AddNotesButton } from "@/components/notes/AddNotesButton";
import { padLectureNumber } from "@/lib/utils/notes";

export function RecentNotes({ userId }: { userId: string }) {
  const notes = useRecentNotes(userId, 5);

  return (
    <section className="h-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent notes</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Your latest lecture notes</p>
        </div>

        <Link href="/notes" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
          View all
        </Link>
      </div>

      {!notes || notes.length === 0 ? (
        <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center dark:border-white/[0.08]">
          <NotebookPen size={18} className="mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No notes yet</p>
          <p className="mt-1 mb-3 text-xs text-slate-400 dark:text-slate-500">Save what you learn in class.</p>
          {notes && <AddNotesButton />}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {notes.map(({ lecture, subjectName, subjectColor }) => (
            <li key={lecture.id}>
              <Link
                href={`/notes/lecture/${lecture.id}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm dark:border-white/[0.05] dark:bg-white/[0.02] dark:hover:border-white/[0.1] dark:hover:bg-white/[0.04]"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: subjectColor }}
                >
                  {padLectureNumber(lecture.lecture_number)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700 transition-colors group-hover:text-brand-600 dark:text-slate-200 dark:group-hover:text-brand-400">
                    {lecture.title}
                  </p>
                  <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                    {subjectName} &bull; {formatDistanceToNow(new Date(lecture.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <ChevronRight size={15} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
