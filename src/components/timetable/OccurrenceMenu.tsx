"use client";
import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cancelOccurrence, moveOccurrence } from "@/lib/db/repo/timetable";
import { useAllSubjects } from "@/hooks/useSubjects";
import type { TimetableOccurrence } from "@/lib/timetable/occurrences";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
export function OccurrenceMenu({ userId, occurrence }: { userId: string; occurrence: TimetableOccurrence }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "move">("menu");
  const subjects = useAllSubjects(userId);
  const [newDate, setNewDate] = useState(occurrence.date);
  const [newStart, setNewStart] = useState(occurrence.startTime);
  const [newEnd, setNewEnd] = useState(occurrence.endTime);
  const [newSubject, setNewSubject] = useState(occurrence.subjectId);
  const handleCancel = async () => {
    if (!window.confirm("Cancel this one class? The regular weekly schedule stays unchanged.")) return;
    await cancelOccurrence(userId, occurrence.slotId, occurrence.date);
    setOpen(false);
  };
  const handleMove = async () => {
    await moveOccurrence(userId, {
      slotId: occurrence.slotId,
      occurrenceDate: occurrence.date,
      newDate,
      newStartTime: newStart,
      newEndTime: newEnd,
      newSubjectId: newSubject,
    });
    setOpen(false);
  };
  return (
    <>
      <button onClick={() => { setOpen(true); setMode("menu"); }} className="rounded-md p-1 text-slate-400 hover:bg-white/60 dark:hover:bg-black/20">
        <MoreVertical size={14} />
      </button>
      {open && (
        <Modal title={mode === "menu" ? "This class" : "Move this occurrence"} onClose={() => setOpen(false)}>
          {mode === "menu" ? (
            <div className="flex flex-col gap-2">
              <button onClick={handleCancel} className="rounded-xl border border-rose-200 px-4 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-400">
                Cancel this occurrence only
              </button>
              <button onClick={() => setMode("move")} className="rounded-xl border border-slate-200 px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">
                Move this occurrence only
              </button>
              <p className="mt-1 text-xs text-slate-400">The regular weekly schedule is never changed by these actions.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">New date</label>
                <input type="date" className={inputClass} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Start</label>
                  <input type="time" className={inputClass} value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">End</label>
                  <input type="time" className={inputClass} value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Subject</label>
                <select className={inputClass} value={newSubject} onChange={(e) => setNewSubject(e.target.value)}>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button onClick={handleMove} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                Save move
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
