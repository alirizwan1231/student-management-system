import Link from "next/link";
import type { Subject } from "@/types/academic";

export function SubjectsWidget({
  subjects,
  semesterHref,
}: {
  subjects: Subject[];
  semesterHref: string | null;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Your subjects</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Quick access to your courses</p>
        </div>

        {semesterHref && (
          <Link
            href={semesterHref}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            View all
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
              <path d="m7.5 15 5-5-5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center dark:border-white/[0.08]">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No subjects yet</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Add a subject from the sidebar to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 transition-all hover:-translate-y-[1px] hover:border-slate-300 hover:bg-white hover:shadow-sm dark:border-white/[0.07] dark:bg-white/[0.02] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.035]"
            >
              <div
                className="absolute bottom-0 left-0 top-0 w-1"
                style={{ backgroundColor: subject.color || "#3366ff" }}
              />

              <div className="pl-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: subject.color || "#3366ff" }}
                  />
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {subject.name}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href={`/notes/subject/${subject.id}`}
                    className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Notes
                  </Link>
                  <Link
                    href={`/subjects/${subject.id}/tasks`}
                    className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Tasks
                  </Link>
                  <Link
                    href={`/subjects/${subject.id}/resources`}
                    className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Resources
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
