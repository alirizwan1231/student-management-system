"use client";

import { useEffect, useState } from "react";
import { BarChart, DonutChart, HBars, LineChart } from "@/components/admin/charts";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsData } from "@/lib/admin/data";

const RANGES = [7, 30, 90];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
      {subtitle && <p className="mb-4 mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  );
}

export function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(`/api/admin/analytics?days=${days}`)
     .then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || body.error || `Request failed (${res.status})`);
    }
    return res.json();
  })
  .then((d: AnalyticsData) => !cancelled && setData(d))
  .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load analytics."));
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                days === r ? "bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-sm font-medium text-status-overdue">{error}</p>}

      {!data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "New users", value: sum(data.signups) },
              { label: "Tasks created", value: sum(data.tasks) },
              { label: "Notes created", value: sum(data.lectures) },
              { label: "Files added", value: sum(data.resources) },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{c.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{c.value}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">last {days} days</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="New signups per day" subtitle="Accounts created (UTC days)">
              <BarChart labels={data.days} values={data.signups} color="#3366ff" />
            </Panel>
            <Panel title="Content activity" subtitle="Tasks, notes and files created per day">
              <LineChart
                labels={data.days}
                series={[
                  { name: "Tasks", color: "#3366ff", values: data.tasks },
                  { name: "Notes", color: "#10b981", values: data.lectures },
                  { name: "Files", color: "#f59e0b", values: data.resources },
                ]}
              />
            </Panel>
            <Panel title="Tasks by status" subtitle="All users, all time">
              <DonutChart data={data.taskStatus} colors={["#94a3b8", "#3366ff", "#10b981", "#f43f5e"]} />
            </Panel>
            <Panel title="Files by type" subtitle="All users, all time">
              <HBars data={data.resourceTypes} color="#8b5cf6" />
            </Panel>
            {data.attendance && (
              <Panel title="Attendance records" subtitle="All users, all time">
                <DonutChart data={data.attendance} colors={["#10b981", "#f59e0b", "#f43f5e", "#94a3b8"]} />
              </Panel>
            )}
            {data.upcomingExams !== null && (
              <Panel title="Upcoming exams" subtitle="Scheduled by students, from today">
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{data.upcomingExams}</p>
              </Panel>
            )}
          </div>
        </>
      )}
    </div>
  );
}
