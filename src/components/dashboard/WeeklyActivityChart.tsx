"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/providers/ThemeProvider";

export function WeeklyActivityChart({
  data,
}: {
  data: { day: string; count: number }[];
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const axisColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <div className="h-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              This week&apos;s deadlines
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Tasks due across the week
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5">
            <path
              d="M5 20V10M12 20V4M19 20v-7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />

            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: axisColor }}
              axisLine={false}
              tickLine={false}
              width={30}
            />

            <Tooltip
              cursor={{ fill: isDark ? "rgba(51,102,255,0.08)" : "rgba(51,102,255,0.05)" }}
              contentStyle={{
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                borderRadius: 12,
                color: isDark ? "#f8fafc" : "#0f172a",
                fontSize: 12,
                boxShadow: isDark
                  ? "0 12px 30px rgba(0,0,0,.25)"
                  : "0 12px 30px rgba(15,23,42,.08)",
              }}
              labelStyle={{
                color: isDark ? "#f8fafc" : "#0f172a",
                fontWeight: 600,
                marginBottom: 4,
              }}
            />

            <Bar dataKey="count" fill="#3366ff" radius={[7, 7, 2, 2]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
