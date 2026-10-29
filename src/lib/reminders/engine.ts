import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { getOccurrencesForDate } from "@/lib/timetable/occurrences";
import type { AcademicTask, Subject } from "@/types/academic";
import type { Exam } from "@/types/exams";
import type { TimetableException, TimetableSlot } from "@/types/timetable";

export interface Reminder {
  key: string; // unique per event so each reminder fires once
  title: string;
  body: string;
  url: string;
}

const HOUR = 60 * 60 * 1000;

export function computeReminders(input: {
  tasks: AcademicTask[];
  exams: Exam[];
  slots: TimetableSlot[];
  exceptions: TimetableException[];
  subjects: Subject[];
  now: Date;
}): Reminder[] {
  const { tasks, exams, slots, exceptions, subjects, now } = input;
  const name = new Map(subjects.map((s) => [s.id, s.name] as const));
  const out: Reminder[] = [];

  for (const t of tasks) {
    if (t.deleted_at || t.status === "completed" || !t.deadline) continue;
    const ms = new Date(t.deadline).getTime() - now.getTime();
    const subject = name.get(t.subject_id) ?? "Task";
    if (ms > 0 && ms <= 24 * HOUR) {
      const hours = Math.max(1, Math.round(ms / HOUR));
      out.push({ key: `task:${t.id}:due`, title: `Due soon: ${t.title}`, body: `${subject} \u2022 due in about ${hours} hour${hours === 1 ? "" : "s"}`, url: "/tasks" });
    } else if (ms <= 0 && ms > -24 * HOUR) {
      out.push({ key: `task:${t.id}:overdue`, title: `Overdue: ${t.title}`, body: `${subject} \u2022 this task is past its deadline`, url: "/tasks" });
    }
  }

  for (const e of exams) {
    if (e.deleted_at) continue;
    const days = differenceInCalendarDays(parseISO(e.exam_date), now);
    if (days === 0 || days === 1 || days === 3) {
      const when = days === 0 ? "today" : days === 1 ? "tomorrow" : "in 3 days";
      out.push({ key: `exam:${e.id}:${days}`, title: `Exam ${when}: ${e.title}`, body: `${name.get(e.subject_id) ?? "Exam"}${e.start_time ? ` \u2022 ${e.start_time.slice(0, 5)}` : ""}${e.room ? ` \u2022 ${e.room}` : ""}`, url: "/exams" });
    }
  }

  const today = format(now, "yyyy-MM-dd");
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  for (const o of getOccurrencesForDate(slots, exceptions, today)) {
    const [h, m] = o.startTime.slice(0, 5).split(":").map(Number);
    const diff = h * 60 + m - minutesNow;
    if (diff >= 0 && diff <= 15) {
      out.push({ key: `class:${o.id}`, title: `Class starting: ${name.get(o.subjectId) ?? "Class"}`, body: `${o.startTime.slice(0, 5)}${o.room ? ` \u2022 ${o.room}` : ""}`, url: "/timetable" });
    }
  }
  return out;
}
