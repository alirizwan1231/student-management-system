"use client";

import Link from "next/link";
import { BookOpen, CalendarClock, CheckCircle2, ClipboardList } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useDashboard } from "@/hooks/useDashboard";
import { StatCard } from "@/components/dashboard/StatCard";
import { WeeklyActivityChart } from "@/components/dashboard/WeeklyActivityChart";
import { TodayLectures } from "@/components/dashboard/TodayLectures";
import { AssignmentBreakdown } from "@/components/dashboard/AssignmentBreakdown";
import { SubjectsWidget } from "@/components/dashboard/SubjectsWidget";
import { UpcomingTasksTable } from "@/components/dashboard/UpcomingTasksTable";
import { OverdueTasks } from "@/components/dashboard/OverdueTasks";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { AddSubjectModal } from "@/components/subjects/AddSubjectModal";
import { AddLectureModal } from "@/components/lectures/AddLectureModal";
import { EmptyState } from "@/components/ui/EmptyState";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useUser();
  const data = useDashboard(user?.id);

  if (!user || !data) {
    return <main className="p-6 text-sm text-slate-400 dark:text-slate-500">Loading...</main>;
  }

  if (data.semesters.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <EmptyState
          title="Set up your first semester"
          description="Everything — subjects, lectures, tasks — lives inside a semester. Create one to get started."
          action={
            <Link href="/semesters" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Create a semester
            </Link>
          }
        />
      </main>
    );
  }

  const semesterHref = data.currentSemester ? `/semesters/${data.currentSemester.id}` : "/semesters";

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">{greeting()}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data.currentSemester ? data.currentSemester.name : "No active semester set"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddSubjectModal userId={user.id} />
          <AddLectureModal userId={user.id} />
          <AddTaskModal userId={user.id} />
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Subjects" value={data.totalSubjects} icon={BookOpen} href={semesterHref} linkLabel="View subjects" />
        <StatCard
          label="This week"
          value={data.thisWeekTasks.length}
          icon={CalendarClock}
          tone="progress"
          href="/calendar"
          linkLabel="View schedule"
        />
        <StatCard
          label="Completed"
          value={data.progress.completedCount}
          icon={CheckCircle2}
          href="/tasks"
          linkLabel="View all"
        />
        <StatCard
          label="Overdue"
          value={data.overdueTasks.length}
          icon={ClipboardList}
          tone="overdue"
          href="/tasks"
          linkLabel="View all"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeeklyActivityChart data={data.weeklyActivity} />
        </div>
        <TodayLectures lectures={data.todaysLectures} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SubjectsWidget subjects={data.subjects} semesterHref={semesterHref} />
        <AssignmentBreakdown {...data.taskBreakdown} />
      </div>

      {data.overdueTasks.length > 0 && (
        <div className="mb-6">
          <OverdueTasks tasks={data.overdueTasks} />
        </div>
      )}

      <UpcomingTasksTable tasks={data.upcomingTasks} subjectNames={data.subjectNameById} />
    </main>
  );
}
