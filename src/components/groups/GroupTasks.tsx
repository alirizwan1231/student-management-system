"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Calendar, ChevronDown, FileText, Paperclip, Pencil, Plus, Repeat, Trash2, Users } from "lucide-react";
import { listGroupMembers, unshareItem } from "@/lib/groups/api";
import {
  deleteGroupTask,
  getTaskProgress,
  getTasksPolicy,
  listCompletions,
  listGroupTasks,
  listTaskNotes,
  rollWeeklyTasks,
  setTaskDone,
  setTasksPolicy,
  stopRepeating,
} from "@/lib/groups/tasks";
import { GroupTaskModal, mondayOf } from "@/components/groups/GroupTaskModal";
import { AddToMyTasksModal, AttachNoteModal, addedKey } from "@/components/groups/GroupTaskExtras";
import { SaveToPersonalModal } from "@/components/groups/SaveToPersonalModal";
import type { GroupMember, GroupSharedItem, LectureSnapshot } from "@/types/groups";
import type { GroupTask, GroupTaskCompletion, TasksPolicy } from "@/types/groupTasks";
import { cn } from "@/lib/utils/cn";

type Filter = "week" | "upcoming" | "earlier" | "done";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "upcoming", label: "Upcoming" },
  { id: "earlier", label: "Earlier" },
  { id: "done", label: "Completed" },
];

const nameOf = (m?: GroupMember) => m?.profiles?.full_name || "Unnamed member";
export function GroupTasks({ groupId, groupName, myRole, userId }: { groupId: string; groupName: string; myRole: string; userId: string }) {
  const weekStart = useMemo(() => mondayOf(new Date()), []);
  const staff = myRole === "owner" || myRole === "moderator";

  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [completions, setCompletions] = useState<GroupTaskCompletion[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<GroupSharedItem[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [policy, setPolicy] = useState<TasksPolicy>("everyone");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("week");
  const [mineOnly, setMineOnly] = useState(false);
  const [editing, setEditing] = useState<GroupTask | null>(null);
  const [adding, setAdding] = useState(false);
  const [addToMine, setAddToMine] = useState<GroupTask | null>(null);
  const [attachTo, setAttachTo] = useState<GroupTask | null>(null);
  const [savingNote, setSavingNote] = useState<GroupSharedItem | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addedTick, setAddedTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setError(null);
      await rollWeeklyTasks(groupId, weekStart).catch(() => undefined); // creates this week's copies of repeating tasks
      const [t, c, p, n, m, pol] = await Promise.all([
        listGroupTasks(groupId),
        listCompletions(groupId),
        getTaskProgress(groupId),
        listTaskNotes(groupId),
        listGroupMembers(groupId),
        getTasksPolicy(groupId),
      ]);
      setTasks(t);
      setCompletions(c);
      setProgress(p);
      setNotes(n);
      setMembers(m);
      setPolicy(pol);
    } catch {
      setError("Could not load group tasks. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [groupId, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const canAdd = policy === "everyone" || staff;
  const myDone = useMemo(() => new Set(completions.filter((c) => c.user_id === userId).map((c) => c.task_id)), [completions, userId]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.user_id, m] as const)), [members]);
  const assignedToMe = (t: GroupTask) => t.assignee_ids === null || t.assignee_ids.includes(userId);

  const visible = useMemo(() => {
    return tasks
      .filter((t) => (mineOnly ? assignedToMe(t) : true))
      .filter((t) => {
        if (filter === "done") return myDone.has(t.id);
        if (filter === "week") return t.week_start === weekStart;
        if (filter === "upcoming") return t.week_start > weekStart;
        return t.week_start < weekStart && !myDone.has(t.id);
      })
      .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.created_at.localeCompare(b.created_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, filter, mineOnly, myDone, weekStart, userId]);

  const toggleDone = async (task: GroupTask) => {
    const done = !myDone.has(task.id);
    // optimistic update
    setCompletions((prev) => (done ? [...prev, { task_id: task.id, user_id: userId, completed_at: new Date().toISOString() }] : prev.filter((c) => !(c.task_id === task.id && c.user_id === userId))));
    setProgress((p) => ({ ...p, [task.id]: Math.max(0, (p[task.id] ?? 0) + (done ? 1 : -1)) }));
    try {
      await setTaskDone(task.id, done);
    } catch {
      setError("Could not save. You may be offline.");
      void load();
    }
  };

  const remove = async (task: GroupTask) => {
    const msg = task.repeat_weekly ? "Delete this task? It also stops the weekly repeat." : "Delete this task for everyone?";
    if (!confirm(msg)) return;
    try {
      await deleteGroupTask(task.id);
      await load();
    } catch {
      setError("Could not delete the task.");
    }
  };

  const changePolicy = async (next: TasksPolicy) => {
    setPolicy(next);
    try {
      await setTasksPolicy(groupId, next);
    } catch {
      setError("Could not change this setting.");
      void load();
    }
  };

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                filter === f.id ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300"
              )}
            >
              {f.label}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Mine only
          </label>
        </div>
        {canAdd ? (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 dark:bg-brand-500">
            <Plus size={15} />Add task
          </button>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500">Only the owner and moderators can add tasks in this group.</p>
        )}
      </div>

      {myRole === "owner" && (
        <label className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Who can add tasks?
          <select value={policy} onChange={(e) => changePolicy(e.target.value as TasksPolicy)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/[0.08] dark:bg-slate-900 dark:text-slate-200">
            <option value="everyone">Everyone in the group</option>
            <option value="staff">Only owner and moderators</option>
          </select>
        </label>
      )}

      {error && <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:border-rose-500/15 dark:bg-rose-500/[0.06] dark:text-rose-400">{error}</p>}

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">No tasks here</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {filter === "week" ? "Nothing planned for this week yet." : filter === "done" ? "Tasks you complete will show up here." : "Nothing to show."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((t) => {
            const mine = assignedToMe(t);
            const total = t.assignee_ids ? t.assignee_ids.length : members.length;
            const done = progress[t.id] ?? 0;
            const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
            const taskNotes = notes.filter((n) => n.group_task_id === t.id);
            const overdue = t.due_date && !myDone.has(t.id) && differenceInCalendarDays(parseISO(t.due_date), new Date()) < 0;
            const canManage = t.created_by === userId || staff;
            const alreadyAdded = typeof window !== "undefined" && localStorage.getItem(addedKey(t.id)) === "1";
            const open = expanded === t.id;
            const doneIds = new Set(completions.filter((c) => c.task_id === t.id).map((c) => c.user_id));
            const assignees = t.assignee_ids ? t.assignee_ids : members.map((m) => m.user_id);
            return (
              <li key={t.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
                <div className="flex items-start gap-3">
                  {mine ? (
                    <input type="checkbox" aria-label="Mark as done" checked={myDone.has(t.id)} onChange={() => toggleDone(t)} className="mt-1 h-4 w-4 shrink-0" />
                  ) : (
                    <span className="mt-1 h-4 w-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-bold text-slate-900 dark:text-white", myDone.has(t.id) && "text-slate-400 line-through dark:text-slate-500")}>{t.title}</p>
                    {t.description && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500 dark:text-slate-400">{t.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {t.subject_name && <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-white/[0.06]">{t.subject_name}</span>}
                      {t.due_date && (
                        <span className={cn("inline-flex items-center gap-1", overdue && "font-bold text-rose-600 dark:text-rose-400")}>
                          <Calendar size={12} />
                          {format(parseISO(t.due_date), "EEE, d MMM")}
                          {overdue ? " • overdue" : ""}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1"><Users size={12} />{t.assignee_ids ? `${t.assignee_ids.length} assigned` : "Everyone"}</span>
                      {t.repeat_weekly && <span className="inline-flex items-center gap-1 text-brand-600 dark:text-brand-400"><Repeat size={12} />Weekly</span>}
                      <span>by {nameOf(memberById.get(t.created_by))}</span>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>{done} / {total} done</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {taskNotes.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {taskNotes.map((n) => {
                          const s = n.snapshot as LectureSnapshot;
                          return (
                            <li key={n.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-white/[0.04]">
                              <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-700 dark:text-slate-200"><FileText size={12} className="shrink-0" /><span className="truncate font-semibold">{s.title}</span><span className="shrink-0 text-slate-400">• {nameOf(memberById.get(n.shared_by))}</span></span>
                              <span className="flex shrink-0 gap-2">
                                <button type="button" onClick={() => setSavingNote(n)} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Save</button>
                                {(n.shared_by === userId || staff) && (
                                  <button type="button" onClick={async () => { await unshareItem(n.id).catch(() => undefined); void load(); }} className="font-semibold text-rose-600 hover:underline dark:text-rose-400">Remove</button>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold">
                      {alreadyAdded && addedTick >= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ In my tasks</span>
                      ) : (
                        <button type="button" onClick={() => setAddToMine(t)} className="text-brand-600 hover:underline dark:text-brand-400">Add to my tasks</button>
                      )}
                      <button type="button" onClick={() => setAttachTo(t)} className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"><Paperclip size={12} />Attach my note</button>
                      {canManage && (
                        <>
                          <button type="button" onClick={() => setEditing(t)} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"><Pencil size={12} />Edit</button>
                          <button type="button" onClick={() => remove(t)} className="inline-flex items-center gap-1 text-rose-600 hover:underline dark:text-rose-400"><Trash2 size={12} />Delete</button>
                          {t.repeat_weekly && (
                            <button type="button" onClick={async () => { await stopRepeating(t.id).catch(() => undefined); void load(); }} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">Stop repeating</button>
                          )}
                        </>
                      )}
                      {staff && (
                        <button type="button" onClick={() => setExpanded(open ? null : t.id)} className="ml-auto inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          Who finished <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
                        </button>
                      )}
                    </div>

                    {staff && open && (
                      <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/[0.04] sm:grid-cols-2">
                        <div>
                          <p className="mb-1 font-bold text-emerald-600 dark:text-emerald-400">Done ({assignees.filter((id) => doneIds.has(id)).length})</p>
                          {assignees.filter((id) => doneIds.has(id)).map((id) => <p key={id} className="text-slate-600 dark:text-slate-300">{nameOf(memberById.get(id))}</p>)}
                        </div>
                        <div>
                          <p className="mb-1 font-bold text-amber-600 dark:text-amber-400">Not yet ({assignees.filter((id) => !doneIds.has(id)).length})</p>
                          {assignees.filter((id) => !doneIds.has(id)).map((id) => <p key={id} className="text-slate-600 dark:text-slate-300">{nameOf(memberById.get(id))}</p>)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(adding || editing) && (
        <GroupTaskModal groupId={groupId} task={editing} members={members} onClose={() => { setAdding(false); setEditing(null); }} onSaved={() => void load()} />
      )}
      {addToMine && (
        <AddToMyTasksModal task={addToMine} groupName={groupName} notes={notes.filter((n) => n.group_task_id === addToMine.id)} onClose={() => setAddToMine(null)} onAdded={() => setAddedTick((x) => x + 1)} />
      )}
      {attachTo && <AttachNoteModal groupId={groupId} task={attachTo} onClose={() => setAttachTo(null)} onAttached={() => void load()} />}
      {savingNote && <SaveToPersonalModal item={savingNote} onClose={() => setSavingNote(null)} />}
    </div>
  );
}