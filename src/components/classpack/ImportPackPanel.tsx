"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import { Select } from "@/components/ui/Select";
import { useSemesters } from "@/hooks/useSemesters";
import { importPack } from "@/lib/classpack/import";
import { exactSubjectMatch, suggestSubject } from "@/lib/classpack/match";
import type { PackDiff, PackLinks } from "@/lib/classpack/links";
import { defaultChoice, toggleChoice, type ChoiceField, type ClassPack, type ImportReport, type PackSubject, type Selection } from "@/lib/classpack/types";
import { PackSubjectRow } from "@/components/classpack/PackSubjectRow";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:focus:bg-slate-900";
const norm = (s: string) => s.trim().toLowerCase();

// For every member: tick what you want from the published pack and import it into your own account.
export function ImportPackPanel({ userId, pack, links, diff, onImported }: { userId: string; pack: ClassPack; links: PackLinks | null; diff: PackDiff; onImported: () => void }) {
  const semesters = useSemesters(userId);
  const { payload } = pack;
  const all = (on: boolean): Selection => {
    const next: Selection = {};
    payload.subjects.forEach((s) => (next[s.key] = defaultChoice(s, on)));
    return next;
  };
  const [selection, setSelection] = useState<Selection>(() => all(true));
  const [targetMode, setTargetMode] = useState<"match" | "existing">("match");
  const [existingId, setExistingId] = useState("");
  const [subjectLinks, setSubjectLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  // Which of MY subjects could a pack subject be merged into?
  const targetSemesterId = targetMode === "existing" ? existingId : (semesters ?? []).find((s) => norm(s.name) === norm(payload.semester.name))?.id ?? "";
  const mySubjects = useLiveQuery(
    () => (targetSemesterId ? db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null && s.semester_id === targetSemesterId).toArray() : []),
    [userId, targetSemesterId],
    []
  );

  // Pre-select the most likely match (the student can change it).
  useEffect(() => {
    setSubjectLinks((prev) => {
      const next = { ...prev };
      for (const s of payload.subjects) {
        if (s.key in next || links?.items[s.key] || exactSubjectMatch(s, mySubjects ?? [])) continue;
        const guess = suggestSubject(s, mySubjects ?? []);
        if (guess) next[s.key] = guess.id;
      }
      return next;
    });
  }, [payload, mySubjects, links]);

  const toggle = (s: PackSubject, field: ChoiceField) => setSelection((prev) => (prev[s.key] ? { ...prev, [s.key]: toggleChoice(prev[s.key], s, field) } : prev));
  const chosen = payload.subjects.filter((s) => selection[s.key]?.subject);

  const linkUi = (s: PackSubject) => {
    if (links?.items[s.key]) return <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Linked to your copy</span>;
    if (exactSubjectMatch(s, mySubjects ?? [])) return <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Already in your account, it will be linked</span>;
    if (!mySubjects || mySubjects.length === 0) return null;
    return (
      <div>
        <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Same as one of my subjects?</label>
        <Select className={`${inputClass} !py-1.5 !text-xs`} value={subjectLinks[s.key] ?? ""} onChange={(e) => setSubjectLinks((p) => ({ ...p, [s.key]: e.target.value }))}>
          <option value="">No, add it as a new subject</option>
          {mySubjects.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ""}</option>
          ))}
        </Select>
      </div>
    );
  };

  const run = async () => {
    setError(null);
    setReport(null);
    if (chosen.length === 0) return setError("Tick at least one subject.");
    if (targetMode === "existing" && !existingId) return setError("Choose which of your semesters to add them to.");
    setBusy(true);
    try {
      setReport(await importPack(userId, pack, selection, targetMode === "existing" ? { mode: "existing", semesterId: existingId } : { mode: "match" }, { subjectLinks }));
      onImported();
    } catch {
      setError("Could not import. Please try again.");
    }
    setBusy(false);
  };

  const part = (added: number, existing: number) => `${added} added${existing ? `, ${existing} already there` : ""}`;
  const updateAvailable = links && (links.version < pack.version || diff.newCount + diff.changedCount > 0);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <Download size={15} className="text-brand-600 dark:text-brand-400" />
        {pack.title}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">v{pack.version}</span>
      </h2>

      {links &&
        (updateAvailable ? (
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <b>Update available</b> (you have v{links.version}): {diff.newCount} new, {diff.changedCount} changed. Press "Import selected" to get only what is new or changed. Anything you edited yourself is kept as it is.
          </p>
        ) : (
          <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">You are up to date.</p>
        ))}
      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Tick what you want. It is copied into your own account, so you never type it again. Importing twice does not create duplicates.</p>

      <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
        <label className="flex items-start gap-2">
          <input type="radio" className="mt-1" checked={targetMode === "match"} onChange={() => setTargetMode("match")} />
          <span>Use my semester "{payload.semester.name}" (created for me if I do not have it)</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="radio" className="mt-1" checked={targetMode === "existing"} onChange={() => setTargetMode("existing")} />
          <span>Add to a semester I already have</span>
        </label>
        {targetMode === "existing" && (
          <Select className={inputClass} value={existingId} onChange={(e) => setExistingId(e.target.value)}>
            <option value="">Choose a semester...</option>
            {(semesters ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-600 dark:text-slate-300">{chosen.length} of {payload.subjects.length} subjects selected</span>
        <span className="flex gap-3 font-semibold text-brand-600 dark:text-brand-400">
          <button type="button" onClick={() => setSelection(all(true))} className="hover:underline">Select all</button>
          <button type="button" onClick={() => setSelection(all(false))} className="hover:underline">None</button>
        </span>
      </div>
      <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/[0.06] dark:border-white/[0.08]">
        {payload.subjects.map((s) => (
          <PackSubjectRow key={s.key} s={s} choice={selection[s.key]} onToggle={(f) => toggle(s, f)} extra={linkUi(s)} />
        ))}
      </ul>

      {error && <p className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
      {report && (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          <p className="font-bold">Imported.</p>
          <p>
            {report.semesterCreated ? "Semester created. " : ""}
            Subjects: {part(report.subjectsAdded, report.subjectsExisting)}. Instructors added: {report.instructorsAdded}. Classes: {part(report.classesAdded, report.classesExisting)}.
          </p>
          <p>
            Notes: {part(report.notesAdded, report.notesExisting)}{report.filesAdded ? ` (${report.filesAdded} files)` : ""}. Tasks: {part(report.tasksAdded, report.tasksExisting)}. Exams: {part(report.examsAdded, report.examsExisting)}.
          </p>
          {(report.itemsUpdated > 0 || report.unchanged > 0) && <p>Updated: {report.itemsUpdated}. Unchanged (skipped): {report.unchanged}.</p>}
          {report.conflicts.length > 0 && (
            <p className="mt-1 font-semibold text-amber-800 dark:text-amber-200">
              Kept your own version of: {report.conflicts.slice(0, 6).join(", ")}{report.conflicts.length > 6 ? ` and ${report.conflicts.length - 6} more` : ""}.
            </p>
          )}
          <Link href="/subjects" className="mt-1 inline-block font-semibold underline">Open my subjects</Link>
        </div>
      )}
      <button type="button" onClick={run} disabled={busy || chosen.length === 0} className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
        {busy ? "Importing..." : "Import selected"}
      </button>
    </section>
  );
}
