import { db } from "@/lib/db";
import { format } from "date-fns";

export interface CalendarEvent {
  id: string;
  date: string; // yyyy-MM-dd
  title: string;
  kind: "lecture" | "task";
  href: string;
}

export async function getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const [lectures, tasks] = await Promise.all([
    db.lectures.where({ user_id: userId }).filter((l) => l.deleted_at === null).toArray(),
    db.tasks.where({ user_id: userId }).filter((t) => t.deleted_at === null).toArray(),
  ]);

  const lectureEvents: CalendarEvent[] = lectures
    .filter((l) => !!l.lecture_date)
    .map((l) => ({
      id: `lecture-${l.id}`,
      date: l.lecture_date as string,
      title: l.title,
      kind: "lecture",
      href: `/lectures/${l.id}`,
    }));

  const taskEvents: CalendarEvent[] = tasks
    .filter((t) => !!t.deadline)
    .map((t) => ({
      id: `task-${t.id}`,
      date: format(new Date(t.deadline as string), "yyyy-MM-dd"),
      title: t.title,
      kind: "task",
      href: `/subjects/${t.subject_id}/tasks`,
    }));

  return [...lectureEvents, ...taskEvents];
}
