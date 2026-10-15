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
export async function getDashboardData(userId: string) {
  const [semesters, subjects, tasks, timetableSlots, timetableExceptions] = await Promise.all([
    db.semesters.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.tasks.where({ user_id: userId }).filter((t) => t.deleted_at === null).toArray(),
    db.timetableSlots.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray() as Promise<TimetableSlot[]>,
    db.timetableExceptions.where({ user_id: userId }).filter((e) => e.deleted_at === null).toArray() as Promise<TimetableException[]>,
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
  // ---- UPCOMING (strictly after this week -- never hidden) ----
  const upcomingTasks = tasks
    .filter((t) => isUpcomingDeadline(t.deadline, t.status))
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  const upcomingPreview = upcomingTasks.slice(0, 8);
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
    upcomingTotalCount: upcomingTasks.length,
    subjectNameById,
    taskBreakdown: { completed: completedCount, inProgress: inProgressCount, pending: pendingCount },
    progress: { completedCount, totalCount: tasks.length, progressPercent: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0 },
  };
}
