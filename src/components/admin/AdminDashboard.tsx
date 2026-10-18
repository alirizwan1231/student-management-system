"use client";
import { useEffect, useState } from "react";
import {
  Users, UserCheck, Shield, GraduationCap, BookOpen, NotebookPen,
  ListChecks, Paperclip, AlertTriangle,
} from "lucide-react";
interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalAdmins: number;
  activeUsers: number;
  totalSemesters: number;
  totalSubjects: number;
  totalLectures: number;
  totalTasks: number;
  totalResources: number;
  overdueTasks: number;
}
const CARDS: { key: keyof Stats; label: string; icon: typeof Users }[] = [
  { key: "totalUsers", label: "Total Users", icon: Users },
  { key: "totalStudents", label: "Students", icon: UserCheck },
  { key: "totalAdmins", label: "Admins", icon: Shield },
  { key: "activeUsers", label: "Active (30d)", icon: UserCheck },
  { key: "totalSemesters", label: "Semesters", icon: GraduationCap },
  { key: "totalSubjects", label: "Subjects", icon: BookOpen },
  { key: "totalLectures", label: "Lectures", icon: NotebookPen },
  { key: "totalTasks", label: "Tasks", icon: ListChecks },
  { key: "totalResources", label: "Resources", icon: Paperclip },
  { key: "overdueTasks", label: "Overdue Tasks", icon: AlertTriangle },
];
export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || body.error || `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load dashboard stats."));
  }, []);
return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
      {error && <p className="mb-4 text-sm font-medium text-status-overdue">{error}</p>}
      {error ? null : !stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CARDS.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <Icon size={16} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats[key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
