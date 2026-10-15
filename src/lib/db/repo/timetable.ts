import { db } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { enqueueChange } from "@/lib/db/syncQueue";
import type { TimetableSlot, TimetableException } from "@/types/timetable";
export interface CreateSlotInput {
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string | null;
  lecturer_id?: string | null;
  color?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}
export async function createTimetableSlot(userId: string, input: CreateSlotInput) {
  const now = nowIso();
  const slot: TimetableSlot = {
    id: newId(),
    user_id: userId,
    subject_id: input.subject_id,
    day_of_week: input.day_of_week,
    start_time: input.start_time,
    end_time: input.end_time,
    room: input.room ?? null,
    lecturer_id: input.lecturer_id ?? null,
    color: input.color ?? null,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.timetableSlots.add(slot);
  await enqueueChange("timetable_slots", slot.id, "create", slot);
  return slot;
}
export async function deleteTimetableSlot(id: string) {
  const deleted_at = nowIso();
  await db.timetableSlots.update(id, { deleted_at, updated_at: deleted_at });
  const record = await db.timetableSlots.get(id);
  if (record) await enqueueChange("timetable_slots", id, "delete", record);
}
export function listTimetableSlots(userId: string) {
  return db.timetableSlots.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray();
}
export function listTimetableExceptions(userId: string) {
  return db.timetableExceptions.where({ user_id: userId }).filter((e) => e.deleted_at === null).toArray();
}
export async function cancelOccurrence(userId: string, slotId: string, occurrenceDate: string, notes?: string) {
  const now = nowIso();
  const exception: TimetableException = {
    id: newId(),
    user_id: userId,
    timetable_slot_id: slotId,
    occurrence_date: occurrenceDate,
    exception_type: "cancelled",
    new_date: null,
    new_start_time: null,
    new_end_time: null,
    new_subject_id: null,
    notes: notes ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.timetableExceptions.add(exception);
  await enqueueChange("timetable_exceptions", exception.id, "create", exception);
  return exception;
}
export async function moveOccurrence(
  userId: string,
  params: {
    slotId: string;
    occurrenceDate: string;
    newDate: string;
    newStartTime: string;
    newEndTime: string;
    newSubjectId?: string | null;
    notes?: string;
  }
) {
  const now = nowIso();
  const exception: TimetableException = {
    id: newId(),
    user_id: userId,
    timetable_slot_id: params.slotId,
    occurrence_date: params.occurrenceDate,
    exception_type: "moved",
    new_date: params.newDate,
    new_start_time: params.newStartTime,
    new_end_time: params.newEndTime,
    new_subject_id: params.newSubjectId ?? null,
    notes: params.notes ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.timetableExceptions.add(exception);
  await enqueueChange("timetable_exceptions", exception.id, "create", exception);
  return exception;
}
