"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock, ShieldCheck, Target, Trash2, UserCheck, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useAllSubjects } from "@/hooks/useSubjects";
import { useAttendanceRecords } from "@/hooks/useAttendance";
import { useTimetableExceptions, useTimetableSlots } from "@/hooks/useTimetable";
import { getOccurrencesForDate } from "@/lib/timetable/occurrences";
import { deleteAttendance, markAttendance } from "@/lib/db/repo/attendance";
import { computeAttendance, overallPercentage, type AttendanceLevel } from "@/lib/attendance/stats";
import type { AttendanceStatus } from "@/types/attendance";
import { cn } from "@/lib/utils/cn";
import { Select } from "@/components/ui/Select";

const TARGET_KEY = "um-attendance-target";
const TARGETS = [60, 65, 70, 75, 80, 85, 90];

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: typeof Check; active: string }[] = [
  { value: "present", label: "Present", icon: Check, active: "border-emerald-500 bg-emerald-500 text-white" },
  { value: "late", label: "Late", icon: Clock, active: "border-amber-500 bg-amber-500 text-white" },
  { value: "absent", label: "Absent", icon: X, active: "border-rose-500 bg-rose-500 text-white" },
  { value: "excused", label: "Excused", icon: ShieldCheck, active: "border-slate-500 bg-slate-500 text-white" },
];

const STATUS_CHIP: Record<AttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  late: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  absent: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  excused: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
};

const LEVEL_STYLE: Record<AttendanceLevel, { stroke: string; text: string; badge: string; label: string }> = {
  none: { stroke: "#94a3b8", text: "text-slate-400", badge: "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400", label: "No data" },
  excellent: { stroke: "#10b981", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", label: "Excellent" },
  safe: { stroke: "#10b981", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", label: "On track" },
  warning: { stroke: "#f59e0b", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", label: "Careful" },
  danger: { stroke: "#f43f5e", text: "text-rose-600 dark:text-rose-400", badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400", label: "Below target" },
};

function Ring({ percent, level }: { percent: number | null; level: AttendanceLevel }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div className="relative h-[68px] w-[68px] shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-slate-100 dark:stroke-white/[0.08]" />
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round" stroke={LEVEL_STYLE[level].stroke} strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center text-sm font-bold", LEVEL_STYLE[level].text)}>
        {percent === null ? "--" : `${Math.round(percent)}%`}
      </span>
    </div>
  );
}

export function AttendanceDashboard() {
  const { user } = useUser();
  const subjects = useAllSubjects(user?.id);
  const records = useAttendanceRecords(user?.id);
  const slots = useTimetableSlots(user?.id);
  const exceptions = useTimetableExceptions(user?.id);

  const [target, setTarget] = useState(75);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [extraSubject, setExtraSubject] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const saved = Number(localStorage.getItem(TARGET_KEY));
    if (TARGETS.includes(saved)) setTarget(saved);
  }, []);
  const changeTarget = (v: number) => {
    setTarget(v);
    localStorage.setItem(TARGET_KEY, String(v));
  };

  const subjectById = useMemo(() => new Map((subjects ?? []).map((s) => [s.id, s] as const)), [subjects]);
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const occurrences = useMemo(
    () => getOccurrencesForDate(slots ?? [], exceptions ?? [], date).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [slots, exceptions, date]
  );

  const tracked = useMemo(() => {
    const ids = new Set<string>();
    for (const s of slots ?? []) if (!s.deleted_at) ids.add(s.subject_id);
    for (const r of records ?? []) ids.add(r.subject_id);
    return [...ids].filter((id) => subjectById.has(id));
  }, [slots, records, subjectById]);

  const cards = useMemo(
    () =>
      tracked
        .map((id) => ({ subject: subjectById.get(id)!, stats: computeAttendance(records ?? [], id, target) }))
        .sort((a, b) => (a.stats.percentage ?? 101) - (b.stats.percentage ?? 101)),
    [tracked, subjectById, records, target]
  );
  const overall = overallPercentage(records ?? []);
  const atRisk = cards.filter((c) => c.stats.level === "danger").length;

  if (!user) return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />;

  const mark = (subjectId: string, status: AttendanceStatus, slotId: string | null) =>
    markAttendance(user.id, { subject_id: subjectId, date, status, slotId });
  const recordFor = (subjectId: string, slotId: string | null) =>
    (records ?? []).find((r) => r.subject_id === subjectId && r.attendance_date === date && r.timetable_slot_id === slotId);

  const StatusButtons = ({ subjectId, slotId }: { subjectId: string; slotId: string | null }) => {
    const current = recordFor(subjectId, slotId);
    return (
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map(({ value, label, icon: Icon, active }) => (
          <button
            key={value}
            type="button"
            onClick={() => (current?.status === value ? deleteAttendance(current.id) : mark(subjectId, value, slotId))}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
              current?.status === value
                ? active
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300"
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Attendance</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Mark each class and see how many you can still miss.</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Target size={14} />
          Required attendance
          <Select
            value={target}
            onChange={(e) => changeTarget(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/[0.08] dark:bg-slate-900 dark:text-slate-200"
          >
            {TARGETS.map((t) => (
              <option key={t} value={t}>{t}%</option>
            ))}
          </Select>
        </label>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Overall", value: overall === null ? "--" : `${Math.round(overall)}%` },
          { label: "Subjects tracked", value: String(cards.length) },
          { label: "Below target", value: String(atRisk), danger: atRisk > 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-bold", s.danger ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white")}>{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {date === todayIso ? "Today's classes" : `Classes on ${format(parseISO(date), "EEE, d MMM")}`}
          </h2>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous day" onClick={() => setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06]">
              <ChevronLeft size={16} />
            </button>
            <input type="date" value={date} max={todayIso} onChange={(e) => e.target.value && setDate(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 dark:border-white/[0.08] dark:bg-slate-900 dark:text-slate-200" />
            <button type="button" aria-label="Next day" disabled={date >= todayIso} onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/[0.06]">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {occurrences.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400 dark:bg-white/[0.03] dark:text-slate-500">
            No classes scheduled on this day. Add classes in the Timetable, or mark an extra class below.
          </p>
        ) : (
          <ul className="space-y-3">
            {occurrences.map((o) => {
              const subject = subjectById.get(o.subjectId);
              return (
                <li key={o.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: o.color || subject?.color || "#3366ff" }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{subject?.name ?? "Subject"}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {o.startTime} - {o.endTime}
                        {o.room ? ` • ${o.room}` : ""}
                      </p>
                    </div>
                  </div>
                  <StatusButtons subjectId={o.subjectId} slotId={o.slotId} />
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
          <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Extra class (not in timetable)</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={extraSubject} onChange={(e) => setExtraSubject(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 dark:border-white/[0.08] dark:bg-slate-900 dark:text-slate-200">
              <option value="">Choose subject...</option>
              {(subjects ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            {extraSubject && <StatusButtons subjectId={extraSubject} slotId={null} />}
          </div>
        </div>
      </section>

      <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">By subject</h2>
      {cards.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <UserCheck size={20} />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Nothing to track yet</p>
          <p className="mt-1 max-w-sm text-xs text-slate-400 dark:text-slate-500">Add subjects and timetable classes, then mark your attendance here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map(({ subject, stats }) => {
            const style = LEVEL_STYLE[stats.level];
            const history = (records ?? []).filter((r) => r.subject_id === subject.id).sort((a, b) => (a.attendance_date < b.attendance_date ? 1 : -1));
            const open = expanded === subject.id;
            return (
              <div key={subject.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
                <div className="flex items-center gap-4 p-4">
                  <Ring percent={stats.percentage} level={stats.level} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{subject.name}</p>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", style.badge)}>{style.label}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      {stats.attended}/{stats.held} attended • {stats.absent} absent{stats.excused ? ` • ${stats.excused} excused` : ""}
                    </p>
                    <p className={cn("mt-2 text-xs font-semibold", style.text)}>
                      {stats.held === 0
                        ? "No classes marked yet"
                        : stats.level === "danger"
                          ? `Attend the next ${stats.needToAttend} ${stats.needToAttend === 1 ? "class" : "classes"} to reach ${target}%`
                          : `You can miss ${stats.canMiss} more ${stats.canMiss === 1 ? "class" : "classes"} and stay above ${target}%`}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setExpanded(open ? null : subject.id)} className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-white/[0.06] dark:text-slate-400 dark:hover:bg-white/[0.03]">
                  History ({history.length})
                  <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
                </button>
                {open && (
                  <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100 dark:divide-white/[0.06] dark:border-white/[0.06]">
                    {history.length === 0 && <li className="px-4 py-3 text-xs text-slate-400">No records yet.</li>}
                    {history.slice(0, 40).map((r) => (
                      <li key={r.id} className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{format(parseISO(r.attendance_date), "EEE, d MMM yyyy")}</span>
                        <span className="flex items-center gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", STATUS_CHIP[r.status])}>{r.status}</span>
                          <button type="button" aria-label="Delete record" onClick={() => deleteAttendance(r.id)} className="rounded p-1 text-slate-300 hover:text-rose-500">
                            <Trash2 size={13} />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
