import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  href,
  linkLabel,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "overdue" | "progress";
  href?: string;
  linkLabel?: string;
}) {
  const toneConfig = {
    default: {
      icon: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
      accent: "bg-slate-300 dark:bg-slate-600",
    },
    overdue: {
      icon: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
      accent: "bg-rose-500",
    },
    progress: {
      icon: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
      accent: "bg-brand-500",
    },
  };

  const config = toneConfig[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-white/[0.12]">
      <div
        className={cn(
          "absolute left-0 top-5 h-10 w-1 rounded-r-full opacity-0 transition-opacity group-hover:opacity-100",
          config.accent
        )}
      />

      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            config.icon
          )}
        >
          <Icon size={18} strokeWidth={1.8} />
        </div>

        {tone === "progress" && (
          <TrendingUp size={15} className="text-status-progress" />
        )}

        {tone === "overdue" && (
          <AlertCircle size={15} className="text-status-overdue" />
        )}

        {tone === "default" && (
          <BarChart3 size={15} className="text-slate-300 dark:text-slate-600" />
        )}
      </div>

      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
      </div>

      {href && linkLabel && (
        <Link
          href={href}
          className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.04]"
        >
          <span>{linkLabel}</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
