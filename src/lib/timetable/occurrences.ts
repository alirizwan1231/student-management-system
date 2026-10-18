import { format } from "date-fns";
import type { TimetableSlot, TimetableException } from "@/types/timetable";
export interface TimetableOccurrence {
  id: string;
  slotId: string;
  subjectId: string;
  date: string; // yyyy-MM-dd — the actual calendar date this falls on
  startTime: string;
  endTime: string;
  room: string | null;
  lecturerId: string | null;
  color: string | null;
  moved: boolean;
  exceptionNotes: string | null;
}
function jsDayToMonFirst(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon..6=Sun
}
// Pure computation -- no DB writes. Given the recurring slots + any
// exceptions, returns what actually happens on one date.
export function getOccurrencesForDate(
  slots: TimetableSlot[],
  exceptions: TimetableException[],
  dateIso: string
): TimetableOccurrence[] {
  const date = new Date(`${dateIso}T00:00:00`);
  const dayOfWeek = jsDayToMonFirst(date.getDay());
  const occurrences: TimetableOccurrence[] = [];
  for (const slot of slots) {
    if (slot.deleted_at) continue;
    if (slot.start_date && dateIso < slot.start_date) continue;
    if (slot.end_date && dateIso > slot.end_date) continue;
    if (slot.day_of_week === dayOfWeek) {
      const exception = exceptions.find(
        (e) => e.timetable_slot_id === slot.id && e.occurrence_date === dateIso && e.deleted_at === null
      );
      if (exception?.exception_type === "cancelled") continue;
      if (exception?.exception_type === "moved") continue; // it left this date
      occurrences.push({
        id: `${slot.id}:${dateIso}`,
        slotId: slot.id,
        subjectId: slot.subject_id,
        date: dateIso,
        startTime: slot.start_time,
        endTime: slot.end_time,
        room: slot.room,
        lecturerId: slot.lecturer_id,
        color: slot.color,
        moved: false,
        exceptionNotes: null,
      });
    }
    // A class moved IN to this date from elsewhere.
    const movedIn = exceptions.find(
      (e) => e.timetable_slot_id === slot.id && e.exception_type === "moved" && e.new_date === dateIso && e.deleted_at === null
    );
    if (movedIn) {
      occurrences.push({
        id: `${slot.id}:${dateIso}:moved`,
        slotId: slot.id,
        subjectId: movedIn.new_subject_id ?? slot.subject_id,
        date: dateIso,
        startTime: movedIn.new_start_time ?? slot.start_time,
        endTime: movedIn.new_end_time ?? slot.end_time,
        room: slot.room,
        lecturerId: slot.lecturer_id,
        color: slot.color,
        moved: true,
        exceptionNotes: movedIn.notes,
      });
    }
  }
  return occurrences.sort((a, b) => a.startTime.localeCompare(b.startTime));
}
export function getOccurrencesForRange(
  slots: TimetableSlot[],
  exceptions: TimetableException[],
  startDateIso: string,
  days: number
): Record<string, TimetableOccurrence[]> {
  const result: Record<string, TimetableOccurrence[]> = {};
  const start = new Date(`${startDateIso}T00:00:00`);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = format(d, "yyyy-MM-dd");
    result[iso] = getOccurrencesForDate(slots, exceptions, iso);
  }
  return result;
}
