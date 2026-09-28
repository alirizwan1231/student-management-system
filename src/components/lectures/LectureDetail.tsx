"use client";

import { useLecture } from "@/hooks/useLectures";
import { useLectureResources } from "@/hooks/useResources";
import { useUser } from "@/hooks/useUser";
import { ResourceForm } from "@/components/resources/ResourceForm";
import { ResourceList } from "@/components/resources/ResourceList";

export function LectureDetail({ lectureId }: { lectureId: string }) {
  const lecture = useLecture(lectureId);
  const resources = useLectureResources(lectureId);
  const { user } = useUser();

  if (!lecture) return <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>;

  return (
    <article className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-brand-700 dark:text-brand-400">
          {lecture.lecture_number ? `Lecture ${lecture.lecture_number}: ` : ""}
          {lecture.title}
        </h1>
        {lecture.lecture_date && <p className="text-sm text-slate-400 dark:text-slate-500">{lecture.lecture_date}</p>}
      </header>

      {(lecture.short_summary || lecture.keywords.length > 0) && (
        <section className="rounded-2xl bg-brand-50 p-4 dark:bg-brand-950/40">
          <h2 className="mb-2 text-sm font-semibold text-brand-700 dark:text-brand-300">Quick recall</h2>
          {lecture.short_summary && <p className="text-sm text-slate-700 dark:text-slate-200">{lecture.short_summary}</p>}
          {lecture.keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {lecture.keywords.map((k) => (
                <span key={k} className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  {k}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {lecture.detailed_notes && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Detailed notes</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{lecture.detailed_notes}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Slides &amp; files</h2>
        <div className="flex flex-col gap-3">
          <ResourceList resources={resources} />
          {user && <ResourceForm userId={user.id} lectureId={lectureId} />}
        </div>
      </section>
    </article>
  );
}
