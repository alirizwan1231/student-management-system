"use client";

import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useLectures } from "@/hooks/useLectures";
import { deleteLecture } from "@/lib/db/repo/lectures";
import { LectureForm } from "./LectureForm";

export function LectureList({ subjectId }: { subjectId: string }) {
  const { user } = useUser();
  const lectures = useLectures(subjectId);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <LectureForm userId={user.id} subjectId={subjectId} />
      <ul className="flex flex-col gap-2">
        {lectures.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No lectures yet.</p>}
        {lectures.map((l) => (
          <li key={l.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <Link href={`/lectures/${l.id}`} className="font-medium text-slate-800 hover:underline dark:text-slate-100">
                {l.lecture_number ? `#${l.lecture_number} — ` : ""}
                {l.title}
              </Link>
              <button
                onClick={() => deleteLecture(l.id)}
                className="text-xs font-medium text-status-overdue hover:underline"
              >
                Delete
              </button>
            </div>
            {l.lecture_date && <p className="text-xs text-slate-400 dark:text-slate-500">{l.lecture_date}</p>}
            {l.short_summary && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{l.short_summary}</p>}
            {l.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {l.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {k}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
