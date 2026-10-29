import { db } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { enqueueChange } from "@/lib/db/syncQueue";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";

export function listAttendance(userId: string) {
  return db.attendanceRecords.where({ user_id: userId }).filter((r) => r.deleted_at === null).toArray();
}

// One record per subject + date + class slot. Marking the same class again
// updates the existing record instead of creating a duplicate.
export async function markAttendance(
  userId: string,
  input: { subject_id: string; date: string; status: AttendanceStatus; slotId?: string | null; notes?: string | null }
) {
  const slotId = input.slotId ?? null;
  const existing = (await db.attendanceRecords.where({ user_id: userId }).toArray()).find(
    (r) => r.deleted_at === null && r.subject_id === input.subject_id && r.attendance_date === input.date && r.timetable_slot_id === slotId
  );
  const now = nowIso();
  if (existing) {
    await db.attendanceRecords.update(existing.id, { status: input.status, notes: input.notes ?? existing.notes, updated_at: now });
    const record = await db.attendanceRecords.get(existing.id);
    if (record) await enqueueChange("attendance_records", record.id, "update", record);
    return record;
  }
  const record: AttendanceRecord = {
    id: newId(),
    user_id: userId,
    subject_id: input.subject_id,
    timetable_slot_id: slotId,
    attendance_date: input.date,
    status: input.status,
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.attendanceRecords.add(record);
  await enqueueChange("attendance_records", record.id, "create", record);
  return record;
}

export async function deleteAttendance(id: string) {
  const deleted_at = nowIso();
  await db.attendanceRecords.update(id, { deleted_at, updated_at: deleted_at });
  const record = await db.attendanceRecords.get(id);
  if (record) await enqueueChange("attendance_records", id, "delete", record);
}
