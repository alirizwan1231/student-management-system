"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { useSemesters } from "@/hooks/useSemesters";
import { applySelection, buildPack } from "@/lib/classpack/build";
import { publishWithFiles } from "@/lib/classpack/publish";
import { defaultChoice, toggleChoice, type ChoiceField, type ClassPackPayload, type PackSubject, type Selection } from "@/lib/classpack/types";
import { PackSubjectRow } from "@/components/classpack/PackSubjectRow";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:focus:bg-slate-900";

const initialSelection = (p: ClassPackPayload, on: boolean): Selection => {
  const next: Selection = {};
  p.subjects.forEach((s) => (next[s.key] = defaultChoice(s, on)));
  return next;
};

// For the class representative: tick what to share, publish once.
export function PublishPackPanel({ userId, groupId, currentVersion, onPublished }: { userId: string; groupId: string; currentVersion: number; onPublished: () => void }) {
  const semesters = useSemesters(userId);
  const [semesterId, setSemesterId] = useState("");
  const [payload, setPayload] = useState<ClassPackPayload | null>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [itemSel, setItemSel] = useState<Record<string, boolean>>({});
  const [skipped, setSkipped] = useState(0);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (semesterId || !semesters || semesters.length === 0) return;
    setSemesterId((semesters.find((s) => s.is_active) ?? semesters[0]).id);
  }, [semesters, semesterId]);

  useEffect(() => {
    if (!semesterId) return;
    let cancelled = false;
    buildPack(userId, semesterId).then((built) => {
      if (cancelled) return;
      setPayload(built?.payload ?? null);
      setSkipped(built?.skippedFiles ?? 0);
      setSelection(built ? initialSelection(built.payload, true) : {});
      setItemSel({});
      setTitle(built ? built.payload.semester.name : "");
      setMessage(null);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, semesterId]);

  const toggle = (s: PackSubject, field: ChoiceField) => setSelection((prev) => (prev[s.key] ? { ...prev, [s.key]: toggleChoice(prev[s.key], s, field) } : prev));
  const toggleItem = (key: string) => setItemSel((prev) => ({ ...prev, [key]: prev[key] === false }));

  const filtered = payload ? applySelection(payload, selection, itemSel) : null;
  const totals = filtered
    ? filtered.subjects.reduce(
        (t, s) => ({
          classes: t.classes + s.slots.length,
          notes: t.notes + (s.notes?.length ?? 0),
          tasks: t.tasks + (s.tasks?.length ?? 0),
          exams: t.exams + (s.exams?.length ?? 0),
        }),
        { classes: 0, notes: 0, tasks: 0, exams: 0 }
      )
    : { classes: 0, notes: 0, tasks: 0, exams: 0 };

  const publish = async () => {
    if (!filtered || filtered.subjects.length === 0) return setMessage({ ok: false, text: "Tick at least one subject to publish." });
    if (!navigator.onLine) return setMessage({ ok: false, text: "You are offline. Connect to the internet to publish." });
    if (currentVersion > 0 && !confirm(`This replaces the pack your group sees now (version ${currentVersion}). Continue?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const { version, skippedFiles } = await publishWithFiles(groupId, title.trim() || filtered.semester.name, filtered);
      setMessage({
        ok: true,
        text: `Published (version ${version}). Your classmates were notified and can import it now.${skippedFiles ? ` ${skippedFiles} file(s) could not be shared (still uploading or missing).` : ""}`,
      });
      onPublished();
    } catch (err) {
      const raw = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "";
      setMessage({ ok: false, text: /only the owner/i.test(raw) ? "Only the group owner or moderators can publish." : raw || "Could not publish. Please try again." });
    }
    setBusy(false);
  };

  return (
    <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <Upload size={15} className="text-brand-600 dark:text-brand-400" />
        Publish your class pack
      </h2>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Choose a semester, tick what your classmates should get (subjects, instructors, timetable, notes with files, tasks, exams) and publish. They import it with one click.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Semester</label>
          <Select className={inputClass} value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
            {(semesters ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pack title</label>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 3rd Semester - Software Engineering" />
        </div>
      </div>

      {!payload || payload.subjects.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-white/[0.04] dark:text-slate-500">
          {semesters && semesters.length === 0 ? "Create a semester with subjects first." : "This semester has no subjects yet."}
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              {filtered?.subjects.length} subjects, {totals.classes} classes, {totals.notes} notes, {totals.tasks} tasks, {totals.exams} exams
            </span>
            <span className="flex gap-3 font-semibold text-brand-600 dark:text-brand-400">
              <button type="button" onClick={() => setSelection(initialSelection(payload, true))} className="hover:underline">Select all</button>
              <button type="button" onClick={() => setSelection(initialSelection(payload, false))} className="hover:underline">None</button>
            </span>
          </div>
          {skipped > 0 && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">{skipped} attached file(s) are still uploading or not in the cloud, so they will not be shared yet.</p>}
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/[0.06] dark:border-white/[0.08]">
            {payload.subjects.map((s) => (
              <PackSubjectRow key={s.key} s={s} choice={selection[s.key]} onToggle={(f) => toggle(s, f)} items={{ selected: itemSel, onToggleItem: toggleItem }} />
            ))}
          </ul>
        </>
      )}

      {message && <p className={`mt-3 text-xs font-medium ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{message.text}</p>}
      <button type="button" onClick={publish} disabled={busy || !payload || payload.subjects.length === 0} className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
        {busy ? "Publishing..." : currentVersion > 0 ? "Publish update to group" : "Publish to group"}
      </button>
    </section>
  );
}
