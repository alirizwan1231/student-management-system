"use client";
import { useMemo } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useTimetableSlots } from "@/hooks/useTimetable";
import { useAllSubjects } from "@/hooks/useSubjects";
import { deleteTimetableSlot } from "@/lib/db/repo/timetable";
import { AddSlotModal } from "@/components/timetable/AddSlotModal";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function TimetableGrid() {
  const { user } = useUser();
  const slots = useTimetableSlots(user?.id);
  const subjects = useAllSubjects(user?.id);
  const subjectById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);
  const byDay = useMemo(() => {
    const map = new Map<number, typeof slots>();
    for (const s of slots) {
      const list = map.get(s.day_of_week) ?? [];
      list.push(s);
      map.set(s.day_of_week, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return map;
  }, [slots]);
  if (!user) return null;
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">Timetable</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your weekly class schedule.</p>
        </div>
        <AddSlotModal userId={user.id} />
      </div>
      {slots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-white/[0.12]">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No classes added yet</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Add your weekly classes to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {DAYS.map((day, i) => (
            <div key={day} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{day}</p>
              <div className="flex flex-col gap-2">
                {(byDay.get(i) ?? []).map((slot) => {
                  const subject = subjectById[slot.subject_id];
                  return (
                    <div
                      key={slot.id}
                      className="group relative rounded-xl p-2.5 text-xs"
                      style={{ backgroundColor: `${subject?.color ?? "#3366ff"}1a`, borderLeft: `3px solid ${subject?.color ?? "#3366ff"}` }}
                    >
                      <Link href={subject ? `/subjects/${subject.id}` : "#"} className="font-semibold text-slate-800 dark:text-slate-100">
                        {subject?.name ?? "Subject"}
                      </Link>
                      <p className="text-slate-500 dark:text-slate-400">{slot.start_time}–{slot.end_time}</p>
                      {slot.room && <p className="text-slate-400 dark:text-slate-500">{slot.room}</p>}
                      <button
                        onClick={() => deleteTimetableSlot(slot.id)}
                        className="absolute right-1.5 top-1.5 hidden rounded-full p-0.5 text-slate-400 hover:bg-white group-hover:block dark:hover:bg-slate-800"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
                {(byDay.get(i) ?? []).length === 0 && <p className="text-xs text-slate-300 dark:text-slate-700">—</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
