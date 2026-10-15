import Link from "next/link";
import { relativeDeadlineLabel } from "@/lib/utils/date-ranges";
import type { AcademicTask } from "@/types/academic";
export function UpcomingList({ tasks, totalCount, subjectNames }: { tasks: AcademicTask[]; totalCount: number; subjectNames: Record<string, string> }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Upcoming</h2>
        <Link href="/tasks?filter=upcoming" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
          View All Upcoming
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No upcoming deadlines.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks/${t.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:border-slate-200 dark:border-white/[0.05]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{t.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{subjectNames[t.subject_id] ?? "Subject"}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                  {relativeDeadlineLabel(t.deadline!)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {totalCount > tasks.length && (
        <p className="mt-2 text-center text-xs text-slate-400">+{totalCount - tasks.length} more</p>
      )}
    </section>
  );
}
