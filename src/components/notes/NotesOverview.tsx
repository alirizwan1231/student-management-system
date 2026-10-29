"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, NotebookPen, Paperclip, Search, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useNotesOverview } from "@/hooks/useNotes";
import { AddNotesButton } from "@/components/notes/AddNotesButton";
import { noteMatchesQuery, padLectureNumber } from "@/lib/utils/notes";
import { cn } from "@/lib/utils/cn";

// The Notes home: subjects first (never every note mixed together).
// Typing in the search box switches to a flat list of matching lectures.
export function NotesOverview() {
  const { user } = useUser();
  const overview = useNotesOverview(user?.id);
  const [query, setQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string | undefined>(undefined);

  const activeSemesterId = overview?.semesters.find((s) => s.is_active)?.id;
  const effectiveSemester = semesterFilter ?? activeSemesterId ?? "all";

  const visibleSummaries = useMemo(() => {
    if (!overview) return [];
    return overview.summaries.filter((s) => effectiveSemester === "all" || s.subject.semester_id === effectiveSemester);
  }, [overview, effectiveSemester]);

  const results = useMemo(() => {
    if (!overview || !query.trim()) return [];
    return overview.lectures
      .filter((l) => noteMatchesQuery(l, query))
      .filter((l) => {
        if (effectiveSemester === "all") return true;
        return overview.subjectById[l.subject_id]?.semester_id === effectiveSemester;
      })
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, 50);
  }, [overview, query, effectiveSemester]);

  if (!user || !overview) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-white/[0.06]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  const totalNotes = overview.lectures.length;
  const searching = query.trim().length > 0;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">My Notes</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Everything you learned in class, organised by subject.
          </p>
        </div>
        <AddNotesButton />
      </header>

      {totalNotes === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <NotebookPen size={22} />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">No notes yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Start documenting your lectures and build your personal knowledge library.
          </p>
          <div className="mt-5">
            <AddNotesButton />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes, keywords or titles..."
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

            {overview.semesters.length > 1 && (
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:pb-0">
                {[{ id: "all", name: "All semesters" }, ...overview.semesters.map((s) => ({ id: s.id, name: s.name }))].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSemesterFilter(item.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                      effectiveSemester === item.id
                        ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300"
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {searching ? (
            results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/[0.12]">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No notes match &ldquo;{query.trim()}&rdquo;</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Try a different word, or switch semester.</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {results.map((lecture) => (
                  <li key={lecture.id}>
                    <Link
                      href={`/notes/lecture/${lecture.id}`}
                      className="group flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-[1px] hover:border-slate-300 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-white/[0.12]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                        {padLectureNumber(lecture.lecture_number)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{lecture.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                          {overview.subjectById[lecture.subject_id]?.name ?? "Subject"}
                          {lecture.short_summary ? ` \u2022 ${lecture.short_summary}` : ""}
                        </p>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : visibleSummaries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/[0.12]">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No subjects in this semester</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Choose another semester above, or add a subject first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleSummaries.map(({ subject, semester, lectureCount, fileCount, lastUpdated }) => (
                <Link
                  key={subject.id}
                  href={`/notes/subject/${subject.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-white/[0.12]"
                >
                  <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: subject.color || "#3366ff" }} />

                  <div className="flex items-start justify-between gap-3 pl-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">{subject.name}</h2>
                      <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                        {[subject.code, semester?.name].filter(Boolean).join(" \u2022 ") || "Subject"}
                      </p>
                    </div>
                    <ChevronRight size={16} className="mt-1 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600" />
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3 pl-2">
                    <div>
                      <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{lectureCount}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {lectureCount === 1 ? "Lecture" : "Lectures"}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 dark:text-slate-500">
                      {fileCount > 0 && (
                        <p className="mb-1 inline-flex items-center gap-1 font-medium">
                          <Paperclip size={11} />
                          {fileCount} {fileCount === 1 ? "file" : "files"}
                        </p>
                      )}
                      <p>
                        {lastUpdated
                          ? `Updated ${formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}`
                          : "No notes yet"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
