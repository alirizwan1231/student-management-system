"use client";

import { useState } from "react";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { createGroupTask, updateGroupTask } from "@/lib/groups/tasks";
import type { GroupMember } from "@/types/groups";
import type { GroupTask, GroupTaskInput } from "@/types/groupTasks";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100 dark:focus:bg-slate-900";
const labelClass = "mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300";

export const mondayOf = (d: Date) => format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");

function memberName(m: GroupMember) {
 return m.profiles?.full_name || "Unnamed member";
}

export function GroupTaskModal({
  groupId,
  task,
  members,
  onClose,
  onSaved,
}: {
  groupId: string;
  task: GroupTask | null;
  members: GroupMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const thisWeek = mondayOf(new Date());
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [subject, setSubject] = useState(task?.subject_name ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [weekOffset, setWeekOffset] = useState(task ? Math.round((parseISO(task.week_start).getTime() - parseISO(thisWeek).getTime()) / (7 * 86400000)) : 0);
  const [everyone, setEveryone] = useState(task ? task.assignee_ids === null : true);
  const [selected, setSelected] = useState<string[]>(task?.assignee_ids ?? []);
  const [repeat, setRepeat] = useState(task?.repeat_weekly ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleMember = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Give the task a title.");
    if (!everyone && selected.length === 0) return setError("Choose at least one member, or assign it to everyone.");
    if (!navigator.onLine) return setError("You are offline. Group tasks need an internet connection to save.");
    const week_start = dueDate ? mondayOf(parseISO(dueDate)) : format(addDays(parseISO(thisWeek), weekOffset * 7), "yyyy-MM-dd");
    const input: GroupTaskInput = {
      title: title.trim(),
      description: description.trim() || null,
      subject_name: subject.trim() || null,
      due_date: dueDate || null,
      week_start,
      assignee_ids: everyone ? null : selected,
      repeat_weekly: repeat,
    };
    setBusy(true);
    try {
      if (task) await updateGroupTask(task, input);
      else await createGroupTask(groupId, input);
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(/row-level security|policy/i.test(msg) ? "Only the owner or moderators can add tasks in this group." : "Could not save the task. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Modal title={task ? "Edit group task" : "Add group task"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div>
          <label className={labelClass}>Title</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summarise Chapter 4" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should everyone do?" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Subject (optional)</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Data Structures" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
        </div>
        {!dueDate && (
          <div>
            <label className={labelClass}>Which week?</label>
            <select value={weekOffset} onChange={(e) => setWeekOffset(Number(e.target.value))} className={inputClass}>
              <option value={0}>This week</option>
              <option value={1}>Next week</option>
              <option value={2}>In 2 weeks</option>
              <option value={3}>In 3 weeks</option>
            </select>
          </div>
        )}
        <div>
          <label className={labelClass}>Assign to</label>
          <div className="flex gap-4 text-sm text-slate-700 dark:text-slate-200">
            <label className="flex items-center gap-2"><input type="radio" checked={everyone} onChange={() => setEveryone(true)} />Everyone</label>
            <label className="flex items-center gap-2"><input type="radio" checked={!everyone} onChange={() => setEveryone(false)} />Selected members</label>
          </div>
          {!everyone && (
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-white/[0.08]">
              {members.map((m) => (
                <li key={m.user_id}>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={selected.includes(m.user_id)} onChange={() => toggleMember(m.user_id)} />
                    {memberName(m)}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="mt-1" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          <span>
            Repeat every week
            <span className="block text-xs text-slate-400 dark:text-slate-500">A new copy appears automatically each week, with the due date moved forward.</span>
          </span>
        </label>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:border-rose-500/15 dark:bg-rose-500/[0.06] dark:text-rose-400">{error}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
          {busy ? "Saving..." : task ? "Save changes" : "Add task"}
        </button>
      </form>
    </Modal>
  );
}