import { db } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { enqueueChange } from "@/lib/db/syncQueue";
import type { Lecturer } from "@/types/academic";

export async function createLecturer(userId: string, name: string, email?: string | null) {
  const now = nowIso();
  const lecturer: Lecturer = {
    id: newId(),
    user_id: userId,
    name: name.trim(),
    email: email?.trim() || null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.lecturers.add(lecturer);
  await enqueueChange("lecturers", lecturer.id, "create", lecturer);
  return lecturer;
}

export async function updateLecturer(id: string, changes: Partial<Lecturer>) {
  const updated_at = nowIso();
  await db.lecturers.update(id, { ...changes, updated_at });
  const record = await db.lecturers.get(id);
  if (record) await enqueueChange("lecturers", id, "update", record);
  return record;
}

export async function deleteLecturer(id: string) {
  const deleted_at = nowIso();
  await db.lecturers.update(id, { deleted_at, updated_at: deleted_at });
  const record = await db.lecturers.get(id);
  if (record) await enqueueChange("lecturers", id, "delete", record);
}

export function listAllLecturersForUser(userId: string) {
  return db.lecturers
    .where({ user_id: userId })
    .filter((l) => l.deleted_at === null)
    .toArray();
}

export function getLecturer(id: string) {
  return db.lecturers.get(id);
}

// Case-insensitive find-or-create. Used by SubjectForm so entering the same
// name twice (e.g. "Dr. Ahmed" and "dr ahmed") reuses one instructor record
// instead of creating a duplicate every time a subject is saved.
export async function findOrCreateLecturer(userId: string, rawName: string) {
  const name = rawName.trim();
  if (!name) return null;

  const existing = await db.lecturers
    .where({ user_id: userId })
    .filter((l) => l.deleted_at === null && l.name.trim().toLowerCase() === name.toLowerCase())
    .first();
  if (existing) return existing;

  return createLecturer(userId, name);
}
