import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { DayPlan } from "@/lib/db/repo/dashboard";
export function WeekOverview({ days, subjectNames }: { days: DayPlan[]; subjectNames: Record<string, string> }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <h2 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-200">This Week</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
        {days.map((day) => (
          <div
            key={day.date}
            className={cn(
              "rounded-xl border p-2.5",
              day.isToday ? "border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/30" : "border-slate-100 dark:border-white/[0.06]"
            )}
          >
            <p className="mb-1.5 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">{day.label}</p>
            {day.occurrences.length === 0 && day.tasks.length === 0 ? (
              <p className="text-[11px] text-slate-300 dark:text-slate-700">No items</p>
            ) : (
              <div className="space-y-1">
                {day.occurrences.map((o) => (
                  <Link key={o.id} href={`/subjects/${o.subjectId}`} className="block truncate rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    {subjectNames[o.subjectId] ?? "Class"}
                  </Link>
                ))}
                {day.tasks.map((t) => (
                  <Link key={t.id} href={`/tasks/${t.id}`} className="block truncate rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {t.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
