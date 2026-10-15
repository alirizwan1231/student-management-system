import { db } from "@/lib/db";
import { addDays, format, subDays } from "date-fns";
import { listTimetableExceptions, listTimetableSlots } from "@/lib/db/repo/timetable";
import { getOccurrencesForRange } from "@/lib/timetable/occurrences";

// The calendar shows task deadlines plus recurring timetable classes
// (with cancelled / moved occurrences already applied).
export interface CalendarEvent {
  id: string;
  date: string; // yyyy-MM-dd
  title: string;
  kind: "lecture" | "task" | "class" | "exam";
  href: string;
}

const PAST_DAYS = 120;
const FUTURE_DAYS = 400;

export async function getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const tasks = await db.tasks
    .where({ user_id: userId })
    .filter((t) => t.deleted_at === null)
    .toArray();

  const taskEvents: CalendarEvent[] = tasks
    .filter((t) => !!t.deadline)
    .map((t) => ({
      id: `task-${t.id}`,
      date: format(new Date(t.deadline as string), "yyyy-MM-dd"),
      title: t.title,
      kind: "task" as const,
      href: `/subjects/${t.subject_id}/tasks`,
    }));

  const [slots, exceptions, subjects] = await Promise.all([
    listTimetableSlots(userId),
    listTimetableExceptions(userId),
    db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
  ]);
  const subjectName = new Map(subjects.map((s) => [s.id, s.name] as const));

  const start = format(subDays(new Date(), PAST_DAYS), "yyyy-MM-dd");
  const byDate = getOccurrencesForRange(slots, exceptions, start, PAST_DAYS + FUTURE_DAYS);
  const classEvents: CalendarEvent[] = [];
  for (const [date, occurrences] of Object.entries(byDate)) {
    for (const o of occurrences) {
      classEvents.push({
        id: `class-${o.id}`,
        date,
        title: `${o.startTime} ${subjectName.get(o.subjectId) ?? "Class"}`,
        kind: "class" as const,
        href: "/timetable",
      });
    }
  }
  const exams = await db.exams.where({ user_id: userId }).filter((e) => e.deleted_at === null).toArray();
  const examEvents: CalendarEvent[] = exams.map((e) => ({
    id: `exam-${e.id}`,
    date: e.exam_date,
    title: `${e.start_time ? e.start_time.slice(0, 5) + " " : ""}${e.title}`,
    kind: "exam" as const,
    href: "/exams",
  }));
  return [...taskEvents, ...classEvents, ...examEvents];
}
