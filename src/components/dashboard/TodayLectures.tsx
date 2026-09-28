import Link from "next/link";
import type { Lecture } from "@/types/academic";

export function TodayLectures({ lectures }: { lectures: Lecture[] }) {
  return (
    <section className="h-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Today&apos;s lectures</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Your schedule for today</p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5">
            <path d="M7 3v3M17 3v3M4.5 9.5h15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </div>
      </div>

      {lectures.length === 0 ? (
        <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center dark:border-white/[0.08]">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No lectures today</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Your schedule is clear for today.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {lectures.map((lecture) => (
            <li key={lecture.id}>
              <Link
                href={`/lectures/${lecture.id}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-all hover:border-slate-200 hover:bg-white hover:shadow-sm dark:border-white/[0.05] dark:bg-white/[0.02] dark:hover:border-white/[0.1] dark:hover:bg-white/[0.04]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </div>

                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 transition-colors group-hover:text-brand-600 dark:text-slate-200 dark:group-hover:text-brand-400">
                  {lecture.title}
                </span>

                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600"
                >
                  <path d="m7.5 15 5-5-5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
