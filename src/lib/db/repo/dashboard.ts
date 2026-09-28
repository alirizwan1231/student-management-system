import { db } from "@/lib/db";
import { format, eachDayOfInterval } from "date-fns";
import { todayIso, isInThisWeek, isOverdueDeadline, thisWeekRange } from "@/lib/utils/date-ranges";

export async function getDashboardData(userId: string) {
  const [semesters, subjects, lectures, tasks] = await Promise.all([
    db.semesters.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.lectures.where({ user_id: userId }).filter((l) => l.deleted_at === null).toArray(),
    db.tasks.where({ user_id: userId }).filter((t) => t.deleted_at === null).toArray(),
  ]);

  const currentSemester = semesters.find((s) => s.is_active) ?? null;
  const today = todayIso();

  const subjectsInCurrentSemester = currentSemester
    ? subjects.filter((s) => s.semester_id === currentSemester.id)
    : subjects;

  const todaysLectures = lectures.filter((l) => l.lecture_date === today);
  const thisWeekTasks = tasks.filter((t) => isInThisWeek(t.deadline));
  const overdueTasks = tasks.filter((t) => isOverdueDeadline(t.deadline, t.status));
  const pendingLabs = tasks.filter((t) => t.task_type === "lab" && t.status !== "completed");

  // Bar chart: how many deadlines land on each day of the current week.
  const { start, end } = thisWeekRange();
  const weeklyActivity = eachDayOfInterval({ start, end }).map((day) => {
    const iso = format(day, "yyyy-MM-dd");
    const count = tasks.filter((t) => t.deadline && format(new Date(t.deadline), "yyyy-MM-dd") === iso).length;
    return { day: format(day, "EEE"), count };
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const totalCount = tasks.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // THE FIX for "task added but not visible on dashboard": this list is not
  // filtered to "this week" -- it always shows the next N tasks by nearest
  // deadline (undated tasks last), so a newly created task shows up here
  // immediately regardless of when it's due.
  const upcomingTasks = [...tasks]
    .filter((t) => t.status !== "completed")
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    })
    .slice(0, 8);

  const subjectNameById: Record<string, string> = Object.fromEntries(subjects.map((s) => [s.id, s.name]));

  return {
    semesters,
    currentSemester,
    subjects: subjectsInCurrentSemester,
    totalSubjects: subjects.length,
    todaysLectures,
    thisWeekTasks,
    overdueTasks,
    pendingLabs,
    weeklyActivity,
    upcomingTasks,
    subjectNameById,
    taskBreakdown: { completed: completedCount, inProgress: inProgressCount, pending: pendingCount },
    progress: { completedCount, totalCount, progressPercent },
  };
}
