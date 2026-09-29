"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowDownUp,
  ChevronRight,
  NotebookPen,
  Paperclip,
  Search,
  X,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useSubject } from "@/hooks/useSubjects";
import { useLectures } from "@/hooks/useLectures";
import { useLectureFileCounts } from "@/hooks/useNotes";
import { AddNotesButton } from "@/components/notes/AddNotesButton";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { noteMatchesQuery, padLectureNumber } from "@/lib/utils/notes";
import { cn } from "@/lib/utils/cn";

// Lectures (with their notes) of one subject. `embedded` is used inside the
// subject page tabs, where the page already has its own header.
export function SubjectNotesList({
  subjectId,
  embedded = false,
}: {
  subjectId: string;
  embedded?: boolean;
}) {
  const { user } = useUser();
  const subject = useSubject(subjectId);
  const lectures = useLectures(subjectId);
 const rawFileCounts = useLectureFileCounts(user?.id);

const fileCounts = rawFileCounts as Record<string, number>;

  const [query, setQuery] = useState("");
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [newestFirst, setNewestFirst] = useState(false);

  const topKeywords = useMemo(() => {
    const counts = new Map<string, number>();

    for (const lecture of lectures) {
      for (const keyword of lecture.keywords) {
        counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([keyword]) => keyword);
  }, [lectures]);

  const visible = useMemo(() => {
    const filtered = lectures
      .filter((lecture) => noteMatchesQuery(lecture, query))
      .filter(
        (lecture) =>
          !activeKeyword || lecture.keywords.includes(activeKeyword),
      );

    return newestFirst ? [...filtered].reverse() : filtered;
  }, [lectures, query, activeKeyword, newestFirst]);

  return (
    <div>
      {!embedded && (
        <>
          <Breadcrumbs
            items={[
              { label: "Notes", href: "/notes" },
              { label: subject?.name ?? "Subject" },
            ]}
          />

          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: subject?.color || "#3366ff",
                  }}
                />

                <h1 className="truncate font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {subject?.name ?? "Subject"}
                </h1>
              </div>

              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {lectures.length}{" "}
                {lectures.length === 1 ? "lecture" : "lectures"} with notes
                {subject?.lecturer_name
                  ? ` \u2022 ${subject.lecturer_name}`
                  : ""}
              </p>
            </div>

            <AddNotesButton subjectId={subjectId} />
          </header>
        </>
      )}

      {lectures.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <NotebookPen size={20} />
          </div>

          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            No notes for this subject yet.
          </p>

          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Add notes after your next class to build your library.
          </p>

          <div className="mt-4">
            <AddNotesButton subjectId={subjectId} />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search in this subject..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:focus:border-brand-400"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNewestFirst((value) => !value)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
              >
                <ArrowDownUp size={13} />
                {newestFirst ? "Latest first" : "Lecture order"}
              </button>

              {embedded && <AddNotesButton subjectId={subjectId} />}
            </div>
          </div>

          {topKeywords.length > 0 && (
            <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {topKeywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  onClick={() =>
                    setActiveKeyword((current) =>
                      current === keyword ? null : keyword,
                    )
                  }
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    activeKeyword === keyword
                      ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300",
                  )}
                >
                  {keyword}
                </button>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-white/[0.12]">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No notes match your filters
              </p>

              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveKeyword(null);
                }}
                className="mt-2 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((lecture) => {
                const lectureFileCount = fileCounts[lecture.id] ?? 0;

                return (
                  <li key={lecture.id}>
                    <Link
                      href={`/notes/lecture/${lecture.id}`}
                      className="group flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-white/[0.12] sm:p-5"
                    >
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                        <span className="text-[8px] font-bold uppercase tracking-wider opacity-70">
                          Lec
                        </span>

                        <span className="text-base font-bold leading-none">
                          {padLectureNumber(lecture.lecture_number)}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 sm:text-[15px]">
                          {lecture.title}
                        </h3>

                        {lecture.short_summary && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {lecture.short_summary}
                          </p>
                        )}

                        {lecture.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {lecture.keywords.slice(0, 4).map((keyword) => (
                              <span
                                key={keyword}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
                              >
                                {keyword}
                              </span>
                            ))}

                            {lecture.keywords.length > 4 && (
                              <span className="px-1 py-0.5 text-[10px] font-semibold text-slate-400">
                                +{lecture.keywords.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        <p className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                          <span>
                            Updated{" "}
                            {formatDistanceToNow(
                              new Date(lecture.updated_at),
                              { addSuffix: true },
                            )}
                          </span>

                          {lectureFileCount > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Paperclip size={11} />
                              {lectureFileCount}
                            </span>
                          )}
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="mt-1 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
