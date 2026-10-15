"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { CalendarClock, ClipboardList, Clock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useAllSubjects } from "@/hooks/useSubjects";
import { useExams } from "@/hooks/useExams";
import { createExam, deleteExam, updateExam, type ExamInput } from "@/lib/db/repo/exams";
import { Modal } from "@/components/ui/Modal";
import { EXAM_TYPES, type Exam, type ExamType } from "@/types/exams";
import { cn } from "@/lib/utils/cn";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:focus:bg-slate-900";
const labelClass = "mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300";

function countdown(dateIso: string) {
  const days = differenceInCalendarDays(parseISO(dateIso), new Date());
  if (days < 0) return { text: "Done", tone: "past" as const, days };
  if (days === 0) return { text: "Today", tone: "urgent" as const, days };
  if (days === 1) return { text: "Tomorrow", tone: "urgent" as const, days };
  return { text: `In ${days} days`, tone: days <= 7 ? ("soon" as const) : ("later" as const), days };
}
const TONE: Record<"past" | "urgent" | "soon" | "later", string> = {
  past: "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400",
  urgent: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  soon: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  later: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
};

function ExamModal({ userId, exam, onClose }: { userId: string; exam: Exam | null; onClose: () => void }) {
  const subjects = useAllSubjects(userId);
  const [form, setForm] = useState({
    subject_id: exam?.subject_id ?? "",
    title: exam?.title ?? "",
    exam_type: (exam?.exam_type ?? "midterm") as ExamType,
    exam_date: exam?.exam_date ?? "",
    start_time: exam?.start_time?.slice(0, 5) ?? "",
    duration_minutes: exam?.duration_minutes ? String(exam.duration_minutes) : "",
    room: exam?.room ?? "",
    notes: exam?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject_id) return setError("Choose a subject.");
    if (!form.title.trim()) return setError("Give the exam a title.");
    if (!form.exam_date) return setError("Pick the exam date.");
    const minutes = form.duration_minutes ? Number(form.duration_minutes) : null;
    if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) return setError("Duration must be a positive number of minutes.");
    const input: ExamInput = {
      subject_id: form.subject_id,
      title: form.title.trim(),
      exam_type: form.exam_type,
      exam_date: form.exam_date,
      start_time: form.start_time || null,
      duration_minutes: minutes,
      room: form.room.trim() || null,
      notes: form.notes.trim() || null,
    };
    setBusy(true);
    try {
      if (exam) await updateExam(exam.id, input);
      else await createExam(userId, input);
      onClose();
    } catch {
      setError("Could not save the exam. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Modal title={exam ? "Edit exam" : "Add exam"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div>
          <label className={labelClass}>Subject</label>
          <select value={form.subject_id} onChange={(e) => set("subject_id", e.target.value)} className={inputClass}>
            <option value="">Choose subject...</option>
            {(subjects ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select value={form.exam_type} onChange={(e) => set("exam_type", e.target.value)} className={inputClass}>
              {EXAM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date</label>
            <input type="date" value={form.exam_date} onChange={(e) => set("exam_date", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Title</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Midterm - Chapters 1 to 5" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Start time</label>
            <input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Duration (min)</label>
            <input inputMode="numeric" value={form.duration_minutes} onChange={(e) => set("duration_minutes", e.target.value.replace(/[^\d]/g, ""))} placeholder="90" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Room / venue</label>
          <input value={form.room} onChange={(e) => set("room", e.target.value)} placeholder="Hall B" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Syllabus, allowed material, reminders..." className={inputClass} />
        </div>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:border-rose-500/15 dark:bg-rose-500/[0.06] dark:text-rose-400">{error}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
          {busy ? "Saving..." : exam ? "Save changes" : "Add exam"}
        </button>
      </form>
    </Modal>
  );
}

export function ExamsPage() {
  const { user } = useUser();
  const exams = useExams(user?.id);
  const subjects = useAllSubjects(user?.id);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [adding, setAdding] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const subjectById = useMemo(() => new Map((subjects ?? []).map((s) => [s.id, s] as const)), [subjects]);
  const { upcoming, past } = useMemo(() => {
    const sorted = [...(exams ?? [])].sort((a, b) => (a.exam_date + (a.start_time ?? "")).localeCompare(b.exam_date + (b.start_time ?? "")));
    return {
      upcoming: sorted.filter((e) => countdown(e.exam_date).days >= 0),
      past: sorted.filter((e) => countdown(e.exam_date).days < 0).reverse(),
    };
  }, [exams]);

  if (!user) return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />;
  const next = upcoming[0];

  const card = (exam: Exam) => {
    const subject = subjectById.get(exam.subject_id);
    const c = countdown(exam.exam_date);
    return (
      <li key={exam.id} className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 pl-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: subject?.color || "#3366ff" }} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{exam.title}</p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {subject?.name ?? "Subject"} • {EXAM_TYPES.find((t) => t.value === exam.exam_type)?.label}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", TONE[c.tone])}>{c.text}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5"><CalendarClock size={13} />{format(parseISO(exam.exam_date), "EEE, d MMM yyyy")}</span>
          {exam.start_time && (
            <span className="inline-flex items-center gap-1.5"><Clock size={13} />{exam.start_time.slice(0, 5)}{exam.duration_minutes ? ` (${exam.duration_minutes} min)` : ""}</span>
          )}
          {exam.room && <span className="inline-flex items-center gap-1.5"><MapPin size={13} />{exam.room}</span>}
        </div>
        {exam.notes && <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{exam.notes}</p>}
        <div className="mt-3 flex gap-3">
          <button type="button" onClick={() => setEditing(exam)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"><Pencil size={12} />Edit</button>
          <button type="button" onClick={() => { if (confirm("Delete this exam?")) void deleteExam(exam.id); }} className="inline-flex items-center gap-1 text-xs font-semibold text-status-overdue hover:underline"><Trash2 size={12} />Delete</button>
        </div>
      </li>
    );
  };

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Exam schedule</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Never be surprised by an exam date again.</p>
        </div>
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 dark:bg-brand-500">
          <Plus size={16} />Add exam
        </button>
      </header>

      {next && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-sm">
          <div className="text-center">
            <p className="text-4xl font-bold leading-none">{countdown(next.exam_date).days}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/70">{countdown(next.exam_date).days === 1 ? "day" : "days"} left</p>
          </div>
          <div className="min-w-0 border-l border-white/20 pl-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">Next exam</p>
            <p className="truncate text-base font-bold">{next.title}</p>
            <p className="truncate text-xs text-white/80">{subjectById.get(next.subject_id)?.name} • {format(parseISO(next.exam_date), "EEE, d MMM")}</p>
          </div>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><ClipboardList size={22} /></div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">No exams added</h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">Add your midterms, finals and quizzes to see countdowns and get them on your calendar.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h2 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Upcoming ({upcoming.length})</h2>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{upcoming.map(card)}</ul>
            </>
          )}
          {past.length > 0 && (
            <div className="mt-8">
              <button type="button" onClick={() => setShowPast((v) => !v)} className="mb-3 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
                {showPast ? "Hide" : "Show"} past exams ({past.length})
              </button>
              {showPast && <ul className="grid grid-cols-1 gap-3 opacity-80 md:grid-cols-2">{past.map(card)}</ul>}
            </div>
          )}
        </>
      )}

      {(adding || editing) && <ExamModal userId={user.id} exam={editing} onClose={() => { setAdding(false); setEditing(null); }} />}
    </div>
  );
}
