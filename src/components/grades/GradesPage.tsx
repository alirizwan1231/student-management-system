"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useAllSubjects } from "@/hooks/useSubjects";
import { useGrades } from "@/hooks/useGrades";
import { createGrade, deleteGrade, updateGrade, type GradeInput } from "@/lib/db/repo/grades";
import { computeGpa, GRADE_SCALE, gradeFor, neededOnRemaining, subjectGrade } from "@/lib/grades/calc";
import { Modal } from "@/components/ui/Modal";
import { GRADE_CATEGORIES, type GradeCategory, type GradeEntry } from "@/types/grades";
import { cn } from "@/lib/utils/cn";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:focus:bg-slate-900";
const labelClass = "mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300";
const TARGETS = [60, 70, 80, 85, 90];

function pctColor(p: number) {
  return p >= 80 ? "text-emerald-600 dark:text-emerald-400" : p >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
}

function GradeModal({ userId, entry, defaultSubject, onClose }: { userId: string; entry: GradeEntry | null; defaultSubject: string; onClose: () => void }) {
  const subjects = useAllSubjects(userId);
  const [form, setForm] = useState({
    subject_id: entry?.subject_id ?? defaultSubject,
    title: entry?.title ?? "",
    category: (entry?.category ?? "assignment") as GradeCategory,
    score: entry ? String(entry.score) : "",
    max_score: entry ? String(entry.max_score) : "100",
    weight: entry?.weight != null ? String(entry.weight) : "",
    graded_on: entry?.graded_on ?? "",
    notes: entry?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const score = Number(form.score);
    const max = Number(form.max_score);
    const weight = form.weight === "" ? null : Number(form.weight);
    if (!form.subject_id) return setError("Choose a subject.");
    if (!form.title.trim()) return setError("Give this grade a title.");
    if (form.score === "" || !Number.isFinite(score) || score < 0) return setError("Enter the marks you got.");
    if (!Number.isFinite(max) || max <= 0) return setError("Total marks must be greater than 0.");
    if (score > max) return setError("Marks obtained cannot be more than total marks.");
    if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 100)) return setError("Weight must be between 0 and 100.");
    const input: GradeInput = {
      subject_id: form.subject_id,
      title: form.title.trim(),
      category: form.category,
      score,
      max_score: max,
      weight,
      graded_on: form.graded_on || null,
      notes: form.notes.trim() || null,
    };
    setBusy(true);
    try {
      if (entry) await updateGrade(entry.id, input);
      else await createGrade(userId, input);
      onClose();
    } catch {
      setError("Could not save. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Modal title={entry ? "Edit grade" : "Add grade"} onClose={onClose}>
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
            <label className={labelClass}>Title</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Quiz 1" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
              {GRADE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Marks</label>
            <input inputMode="decimal" value={form.score} onChange={(e) => set("score", e.target.value)} placeholder="18" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Out of</label>
            <input inputMode="decimal" value={form.max_score} onChange={(e) => set("max_score", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Weight %</label>
            <input inputMode="decimal" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="optional" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={form.graded_on} onChange={(e) => set("graded_on", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputClass} />
        </div>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:border-rose-500/15 dark:bg-rose-500/[0.06] dark:text-rose-400">{error}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
          {busy ? "Saving..." : entry ? "Save changes" : "Add grade"}
        </button>
      </form>
    </Modal>
  );
}

export function GradesPage() {
  const { user } = useUser();
  const subjects = useAllSubjects(user?.id);
  const grades = useGrades(user?.id);
  const [editing, setEditing] = useState<GradeEntry | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // default subject id ("" = none)
  const [targets, setTargets] = useState<Record<string, number>>({});

  const cards = useMemo(() => {
    const bySubject = new Map<string, GradeEntry[]>();
    for (const g of grades ?? []) bySubject.set(g.subject_id, [...(bySubject.get(g.subject_id) ?? []), g]);
    return (subjects ?? [])
      .filter((s) => bySubject.has(s.id))
      .map((s) => ({ subject: s, entries: bySubject.get(s.id)!.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), grade: subjectGrade(bySubject.get(s.id)!) }))
      .sort((a, b) => a.subject.name.localeCompare(b.subject.name));
  }, [subjects, grades]);

  const gpa = useMemo(
    () => computeGpa(cards.flatMap((c) => (c.grade.percentage === null ? [] : [{ percentage: c.grade.percentage, credits: c.subject.credit_hours && c.subject.credit_hours > 0 ? c.subject.credit_hours : 3 }]))),
    [cards]
  );
  const totalCredits = cards.reduce((a, c) => a + (c.subject.credit_hours && c.subject.credit_hours > 0 ? c.subject.credit_hours : 3), 0);

  if (!user) return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Grades and GPA</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Track marks per subject and see your GPA update live.</p>
        </div>
        <button type="button" onClick={() => setAdding("")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 dark:bg-brand-500">
          <Plus size={16} />Add grade
        </button>
      </header>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "GPA (4.0)", value: gpa === null ? "--" : gpa.toFixed(2) },
          { label: "Subjects graded", value: String(cards.length) },
          { label: "Credit hours", value: String(totalCredits) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Award size={22} /></div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">No grades yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">Add quiz, assignment, midterm and final marks. Optional weights let the app work out what you need on the final.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map(({ subject, entries, grade }) => {
            const pct = grade.percentage ?? 0;
            const letter = gradeFor(pct);
            const target = targets[subject.id] ?? 85;
            const need = neededOnRemaining(grade, target);
            return (
              <section key={subject.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{subject.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{subject.credit_hours ?? 3} credit hours{subject.credit_hours ? "" : " (default)"}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-2xl font-bold leading-none", pctColor(pct))}>{pct.toFixed(1)}%</p>
                      <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{letter.letter} \u2022 {letter.points.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  {grade.weightSum > 0 && (
                    <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{grade.weightSum.toFixed(0)}% of the final grade is graded so far.</p>
                  )}
                  {need && (
                    <div className="mt-3 rounded-xl bg-brand-50 p-3 text-xs leading-5 text-slate-600 dark:bg-brand-500/10 dark:text-slate-300">
                      <label className="flex flex-wrap items-center gap-2 font-semibold">
                        To finish with
                        <select value={target} onChange={(e) => setTargets((t) => ({ ...t, [subject.id]: Number(e.target.value) }))} className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs dark:border-white/[0.1] dark:bg-slate-900">
                          {TARGETS.map((t) => (
                            <option key={t} value={t}>{t}%</option>
                          ))}
                        </select>
                      </label>
                      <p className="mt-1">
                        {need.needed > 100
                          ? `That is out of reach: you would need ${need.needed.toFixed(0)}% on the remaining ${need.remaining.toFixed(0)}%.`
                          : need.needed <= 0
                            ? "You have already secured this."
                            : `you need about ${need.needed.toFixed(0)}% on the remaining ${need.remaining.toFixed(0)}% of the course.`}
                      </p>
                    </div>
                  )}
                </div>
                <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-white/[0.06] dark:border-white/[0.06]">
                  {entries.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{e.title}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {GRADE_CATEGORIES.find((c) => c.value === e.category)?.label}
                          {e.weight ? ` \u2022 ${e.weight}% weight` : ""}
                          {e.graded_on ? ` \u2022 ${format(parseISO(e.graded_on), "d MMM yyyy")}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{Number(e.score)}/{Number(e.max_score)}</span>
                        <button type="button" aria-label="Edit" onClick={() => setEditing(e)} className="rounded p-1 text-slate-300 hover:text-brand-600"><Pencil size={13} /></button>
                        <button type="button" aria-label="Delete" onClick={() => { if (confirm("Delete this grade?")) void deleteGrade(e.id); }} className="rounded p-1 text-slate-300 hover:text-rose-500"><Trash2 size={13} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => setAdding(subject.id)} className="w-full border-t border-slate-100 px-4 py-2 text-left text-xs font-semibold text-brand-600 hover:bg-slate-50 dark:border-white/[0.06] dark:text-brand-400 dark:hover:bg-white/[0.03]">
                  + Add grade to {subject.name}
                </button>
              </section>
            );
          })}
        </div>
      )}

      <details className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-slate-400">
        <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">How GPA is calculated</summary>
        <p className="mt-2 leading-5">
          Each subject uses the weighted average of its grades (or a plain average when no weights are given), converted with the scale below, then averaged by credit hours
          (set when you edit a subject; 3 if empty). The scale lives in <code>src/lib/grades/calc.ts</code>, so it is easy to match your university.
        </p>
        <p className="mt-2 font-mono leading-5">{GRADE_SCALE.map((r) => `${r.letter}: ${r.min}%+ = ${r.points.toFixed(2)}`).join("  |  ")}</p>
      </details>

      {(adding !== null || editing) && (
        <GradeModal userId={user.id} entry={editing} defaultSubject={adding ?? ""} onClose={() => { setAdding(null); setEditing(null); }} />
      )}
    </div>
  );
}
