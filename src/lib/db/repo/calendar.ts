import { db } from "@/lib/db";
import { format } from "date-fns";

// The calendar shows task deadlines only. Lectures are not scheduled events:
// they are numbered classes whose notes live under Notes.
export interface CalendarEvent {
  id: string;
  date: string; // yyyy-MM-dd
  title: string;
  kind: "lecture" | "task";
  href: string;
}

export async function getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const tasks = await db.tasks
    .where({ user_id: userId })
    .filter((t) => t.deleted_at === null)
    .toArray();

  return tasks
    .filter((t) => !!t.deadline)
    .map((t) => ({
      id: `task-${t.id}`,
      date: format(new Date(t.deadline as string), "yyyy-MM-dd"),
      title: t.title,
      kind: "task" as const,
      href: `/subjects/${t.subject_id}/tasks`,
    }));
}
