"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { BookOpen, CalendarClock, CheckCircle2, ClipboardList } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useDashboard } from "@/hooks/useDashboard";
import { StatCard } from "@/components/dashboard/StatCard";
import { TodaySchedule } from "@/components/dashboard/TodaySchedule";
import { WeekOverview } from "@/components/dashboard/WeekOverview";
import { UpcomingList } from "@/components/dashboard/UpcomingList";
import { AssignmentBreakdown } from "@/components/dashboard/AssignmentBreakdown";
import { SubjectsWidget } from "@/components/dashboard/SubjectsWidget";
import { OverdueTasks } from "@/components/dashboard/OverdueTasks";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { AddSubjectModal } from "@/components/subjects/AddSubjectModal";
import { AddNotesButton } from "@/components/notes/AddNotesButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { NamePrompt } from "@/components/profile/NamePrompt";
import { JoinClassCard } from "@/components/dashboard/JoinClassCard";

// Secondary, network-backed sections: they load as their own chunks after
// the core dashboard (local data) is on screen, instead of blocking it.
const ClassPackUpdates = dynamic(() => import("@/components/dashboard/ClassPackUpdates").then((m) => m.ClassPackUpdates), { ssr: false });
const RecentGroupActivity = dynamic(() => import("@/components/dashboard/RecentGroupActivity").then((m) => m.RecentGroupActivity), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />,
});
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
          description="Everything lives inside a semester. Create one to get started."
          action={<Link href="/semesters" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Create a semester</Link>}
        />
      </main>
    );
  }
const semesterHref = data.currentSemester ? `/semesters/${data.currentSemester.id}` : "/semesters";
  const allCaughtUp = data.todaysOccurrences.length === 0 && data.todaysTasks.length === 0;
  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <NamePrompt />
      <JoinClassCard />
      <ClassPackUpdates userId={user.id} />
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">{greeting()}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddSubjectModal userId={user.id} />
          <AddNotesButton />
          <AddTaskModal userId={user.id} />
        </div>
      </header>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Today" value={data.todaysTasks.length + data.todaysOccurrences.length} icon={CalendarClock} tone="progress" href="/tasks?filter=today" linkLabel="View" />
        <StatCard label="This Week" value={data.thisWeekTaskCount} icon={BookOpen} href="/tasks?filter=thisweek" linkLabel="View" />
        <StatCard label="Upcoming" value={data.upcomingTotalCount} icon={CheckCircle2} href="/tasks?filter=upcoming" linkLabel="View" />
        <StatCard label="Overdue" value={data.overdueTasks.length} icon={ClipboardList} tone="overdue" href="/tasks?filter=overdue" linkLabel="View" />
      </div>
      {data.overdueTasks.length > 0 && (
        <div className="mb-6"><OverdueTasks tasks={data.overdueTasks} /></div>
      )}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TodaySchedule occurrences={data.todaysOccurrences} subjectNames={data.subjectNameById} />
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
          <h2 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-200">Today&apos;s Tasks</h2>
          {allCaughtUp ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">You&apos;re all caught up 🎉 — nothing is scheduled for today.</p>
          ) : data.todaysTasks.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">No tasks due today.</p>
          ) : (
            <ul className="space-y-2">
              {data.todaysTasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:border-slate-200 dark:border-white/[0.05]">
                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{t.title}</span>
                    <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">Due Today</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <div className="mb-6">
        <WeekOverview days={data.thisWeek} subjectNames={data.subjectNameById} />
      </div>
      <div className="mb-6">
        <UpcomingList deadlines={data.upcomingDeadlines} totalCount={data.upcomingTotalCount} />
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SubjectsWidget subjects={data.subjects} semesterHref={semesterHref} />
        <AssignmentBreakdown {...data.taskBreakdown} />
      </div>
      <RecentGroupActivity />
    </main>
  );
}
