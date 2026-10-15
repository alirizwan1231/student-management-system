import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { OccurrenceMenu } from "@/components/timetable/OccurrenceMenu";
import type { TimetableOccurrence } from "@/lib/timetable/occurrences";
export function TodaySchedule({ occurrences, subjectNames }: { occurrences: TimetableOccurrence[]; subjectNames: Record<string, string> }) {
  const { user } = useUser();
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <h2 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-200">Today&apos;s Schedule</h2>
      {occurrences.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No classes today.</p>
      ) : (
        <ul className="space-y-2">
          {occurrences.map((o) => (
            <li key={o.id} className="flex items-center gap-3 rounded-xl p-2.5" style={{ backgroundColor: `${o.color ?? "#3366ff"}14` }}>
              <div className="w-16 shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">{o.startTime}</div>
              <div className="min-w-0 flex-1">
                <Link href={`/subjects/${o.subjectId}`} className="font-semibold text-slate-800 hover:underline dark:text-slate-100">
                  {subjectNames[o.subjectId] ?? "Subject"}
                </Link>
                {o.room && <span className="ml-2 text-xs text-slate-400">· {o.room}</span>}
                {o.moved && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Moved</span>}
              </div>
              {user && <OccurrenceMenu userId={user.id} occurrence={o} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
