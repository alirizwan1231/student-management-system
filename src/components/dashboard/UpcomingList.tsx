import Link from "next/link";
import { relativeDeadlineLabel } from "@/lib/utils/date-ranges";
import type { UpcomingDeadline } from "@/lib/db/repo/dashboard";

// Fix 15 (audit L-2): this list and the "Upcoming" counter both come from
// getDashboardData's shared upcomingDeadlines (tasks + exams, next 30 days),
// so an upcoming exam can no longer coexist with "No upcoming deadlines."
export function UpcomingList({ deadlines, totalCount }: { deadlines: UpcomingDeadline[]; totalCount: number }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Upcoming deadlines</h2>
        <Link href="/calendar" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
          View calendar
        </Link>
      </div>
      {deadlines.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No upcoming deadlines in the next 30 days.</p>
      ) : (
        <ul className="space-y-2">
          {deadlines.map((d) => (
            <li key={`${d.kind}-${d.id}`}>
              <Link href={d.href} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:border-slate-200 dark:border-white/[0.05]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{d.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{d.kind === "exam" ? "Exam" : "Task"} · {d.subjectName}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                  {relativeDeadlineLabel(d.dateIso)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {totalCount > deadlines.length && (
        <p className="mt-2 text-center text-xs text-slate-400">+{totalCount - deadlines.length} more</p>
      )}
    </section>
  );
}
