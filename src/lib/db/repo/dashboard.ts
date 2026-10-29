import type { AcademicTask } from "@/types/academic";
import { db } from "@/lib/db";
import { format, eachDayOfInterval } from "date-fns";
import { todayIso, thisWeekRange, isOverdueDeadline, isUpcomingDeadline, isInThisWeek } from "@/lib/utils/date-ranges";
import { getOccurrencesForDate } from "@/lib/timetable/occurrences";
import type { TimetableSlot, TimetableException } from "@/types/timetable";
export interface DayPlan {
  date: string;
  label: string;
  isToday: boolean;
  tasks: AcademicTask[];
  occurrences: ReturnType<typeof getOccurrencesForDate>;
}
// Fix 15 (audit L-2): ONE shared definition of "upcoming deadlines", used by
// the Dashboard Upcoming list, its counter and (in spirit) the Calendar
// footer: incomplete tasks with a deadline PLUS exams, in the next 30 days.
// The old code counted tasks only, so an exam 6 days away still produced
// "No upcoming deadlines."
export interface UpcomingDeadline {
  id: string;
  kind: "task" | "exam";
  title: string;
  subjectName: string;
  dateIso: string; // ISO datetime for tasks, yyyy-MM-dd for exams
  href: string;
}

export async function getDashboardData(userId: string) {
  const [semesters, subjects, tasks, timetableSlots, timetableExceptions, exams] = await Promise.all([
    db.semesters.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.tasks.where({ user_id: userId }).filter((t) => t.deleted_at === null).toArray(),
    db.timetableSlots.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray() as Promise<TimetableSlot[]>,
    db.timetableExceptions.where({ user_id: userId }).filter((e) => e.deleted_at === null).toArray() as Promise<TimetableException[]>,
    db.exams.where({ user_id: userId }).filter((e) => e.deleted_at === null).toArray(),
  ]);
  const currentSemester = semesters.find((s) => s.is_active) ?? null;
  const today = todayIso();
  const subjectsInCurrentSemester = currentSemester
    ? subjects.filter((s) => s.semester_id === currentSemester.id)
    : subjects;
  // ---- TODAY ----
  const todaysOccurrences = getOccurrencesForDate(timetableSlots, timetableExceptions, today);
  const todaysTasks = tasks.filter(
    (t) => t.deadline && format(new Date(t.deadline), "yyyy-MM-dd") === today && t.status !== "completed"
  );
  // ---- OVERDUE (incomplete only) ----
  const overdueTasks = tasks.filter((t) => isOverdueDeadline(t.deadline, t.status));
  // ---- THIS WEEK (Mon..Sun, grouped by day) ----
  const { start, end } = thisWeekRange();
  const weekDays = eachDayOfInterval({ start, end });
  const thisWeek: DayPlan[] = weekDays.map((day) => {
    const iso = format(day, "yyyy-MM-dd");
    return {
      date: iso,
      label: format(day, "EEE d"),
      isToday: iso === today,
      tasks: tasks.filter((t) => t.deadline && format(new Date(t.deadline), "yyyy-MM-dd") === iso && t.status !== "completed"),
      occurrences: getOccurrencesForDate(timetableSlots, timetableExceptions, iso),
    };
  });
  const thisWeekTaskCount = tasks.filter((t) => isInThisWeek(t.deadline) && t.status !== "completed").length;
  // ---- UPCOMING (next 30 days: task deadlines AND exams, shared rule) ----
  const upcomingTasks = tasks
    .filter((t) => isUpcomingDeadline(t.deadline, t.status))
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  const upcomingPreview = upcomingTasks.slice(0, 8);
  const subjectNameFor = (id: string) => subjects.find((s) => s.id === id)?.name ?? "Subject";
  const inNext30 = (dateIso: string) => {
    const day = format(new Date(dateIso), "yyyy-MM-dd");
    const end = format(new Date(Date.now() + 30 * 24 * 3600 * 1000), "yyyy-MM-dd");
    return day >= today && day <= end;
  };
  const upcomingDeadlines: UpcomingDeadline[] = [
    ...tasks
      .filter((t) => t.deadline && t.status !== "completed" && inNext30(t.deadline))
      .map((t) => ({ id: t.id, kind: "task" as const, title: t.title, subjectName: subjectNameFor(t.subject_id), dateIso: t.deadline as string, href: `/tasks/${t.id}` })),
    ...exams
      .filter((e) => inNext30(e.exam_date))
      .map((e) => ({ id: e.id, kind: "exam" as const, title: e.title, subjectName: subjectNameFor(e.subject_id), dateIso: e.exam_date, href: "/exams" })),
  ].sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
  const upcomingDeadlinePreview = upcomingDeadlines.slice(0, 8);
  // ---- Breakdown (kept from before) ----
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const subjectNameById: Record<string, string> = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  return {
    semesters,
    currentSemester,
    subjects: subjectsInCurrentSemester,
    totalSubjects: subjects.length,
    today,
    todaysOccurrences,
    todaysTasks,
    overdueTasks,
    thisWeek,
    thisWeekTaskCount,
    upcomingTasks: upcomingPreview,
    upcomingDeadlines: upcomingDeadlinePreview,
    upcomingTotalCount: upcomingDeadlines.length,
    subjectNameById,
    taskBreakdown: { completed: completedCount, inProgress: inProgressCount, pending: pendingCount },
    progress: { completedCount, totalCount: tasks.length, progressPercent: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0 },
  };
}
