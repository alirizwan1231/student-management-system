"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useUser } from "@/hooks/useUser";
import { useAllSubjects } from "@/hooks/useSubjects";
import { Modal } from "@/components/ui/Modal";
import { createTask } from "@/lib/db/repo/tasks";
import { createLecture } from "@/lib/db/repo/lectures";
import { attachNoteToTask } from "@/lib/groups/tasks";
import { buildLectureSnapshot } from "@/lib/groups/snapshot";
import type { GroupSharedItem, LectureSnapshot } from "@/types/groups";
import type { GroupTask } from "@/types/groupTasks";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:focus:bg-slate-900";

export const addedKey = (taskId: string) => `um-group-task-added:${taskId}`;

// Copies a group task (and optionally its attached notes) into the user's own
// workspace, so it shows on their dashboard, task list, calendar and reminders.
export function AddToMyTasksModal({
  task,
  groupName,
  notes,
  onClose,
  onAdded,
}: {
  task: GroupTask;
  groupName: string;
  notes: GroupSharedItem[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const { user } = useUser();
  const subjects = useAllSubjects(user?.id);
  const [subjectId, setSubjectId] = useState("");
  const [withNotes, setWithNotes] = useState(notes.length > 0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!user || !subjectId) return;
    setBusy(true);
    setError(null);
    try {
      const deadline = task.due_date ? new Date(`${task.due_date}T23:59:00`).toISOString() : null;
      const description = [task.description, `From group: ${groupName}`].filter(Boolean).join("\n\n");
      await createTask(user.id, { subject_id: subjectId, title: task.title, task_type: "assignment", deadline, priority: "medium", description });
      if (withNotes) {
        for (const n of notes) {
          const s = n.snapshot as LectureSnapshot;
          await createLecture(user.id, {
            subject_id: subjectId,
            title: s.title,
            lecture_number: s.lecture_number,
            lecture_date: null,
            short_summary: s.short_summary,
            detailed_notes: s.detailed_notes,
            keywords: s.keywords ?? [],
          });
        }
      }
      localStorage.setItem(addedKey(task.id), "1");
      onAdded();
      setDone(true);
    } catch {
      setError("Could not add the task. Please try again.");
    }
    setBusy(false);
  };

  return (
    <Modal title="Add to my tasks" onClose={onClose}>
      {done ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Added. It now shows on your dashboard, tasks, calendar and reminders.</p>
          <div className="flex gap-3">
            <Link href="/tasks" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-500">Open my tasks</Link>
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.05]">Close</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <b>{task.title}</b>
            {task.due_date ? ` • due ${task.due_date}` : ""}
          </p>
          <select className={inputClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Choose your subject...</option>
            {(subjects ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {notes.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={withNotes} onChange={(e) => setWithNotes(e.target.checked)} />
              Also save the {notes.length} attached {notes.length === 1 ? "note" : "notes"} to my notes
            </label>
          )}
          {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
          <button type="button" disabled={!subjectId || busy} onClick={save} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
            {busy ? "Adding..." : "Add to my tasks"}
          </button>
        </div>
      )}
    </Modal>
  );
}

// Pick one of your own notes and attach it to a group task ("this note is for this task").
export function AttachNoteModal({ groupId, task, onClose, onAttached }: { groupId: string; task: GroupTask; onClose: () => void; onAttached: () => void }) {
  const { user } = useUser();
  const subjects = useAllSubjects(user?.id);
  const lectures = useLiveQuery(
    () => (user ? db.lectures.where({ user_id: user.id }).filter((l) => l.deleted_at === null).toArray() : []),
    [user?.id],
    []
  );
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subjectName = useMemo(() => new Map((subjects ?? []).map((s) => [s.id, s.name] as const)), [subjects]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(lectures ?? [])]
      .filter((l) => !q || l.title.toLowerCase().includes(q) || (subjectName.get(l.subject_id) ?? "").toLowerCase().includes(q))
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .slice(0, 40);
  }, [lectures, query, subjectName]);

  const attach = async (lectureId: string) => {
    const lecture = (lectures ?? []).find((l) => l.id === lectureId);
    if (!lecture) return;
    if (!navigator.onLine) return setError("You are offline. Attaching a note needs an internet connection.");
    setBusyId(lectureId);
    setError(null);
    try {
      await attachNoteToTask({ groupId, taskId: task.id, sourceId: lecture.id, snapshot: buildLectureSnapshot(lecture, subjectName.get(lecture.subject_id) ?? "Subject") });
      onAttached();
      onClose();
    } catch {
      setError("Could not attach the note. Please try again.");
      setBusyId(null);
    }
  };

  return (
    <Modal title={`Attach a note to "${task.title}"`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your notes..." className={inputClass} />
        {visible.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">You have no notes yet. Create one in Notes first.</p>
        ) : (
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-white/[0.06] dark:border-white/[0.08]">
            {visible.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{l.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{subjectName.get(l.subject_id) ?? "Subject"}</p>
                </div>
                <button type="button" disabled={busyId !== null} onClick={() => attach(l.id)} className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
                  {busyId === l.id ? "Attaching..." : "Attach"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </Modal>
  );
}