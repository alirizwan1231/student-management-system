import { db } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { enqueueChange } from "@/lib/db/syncQueue";
import type { Subject } from "@/types/academic";

export interface CreateSubjectInput {
  semester_id: string;
  name: string;
  code?: string | null;
  lecturer_name?: string | null;
  lecturer_id?: string | null;
  description?: string | null;
  credit_hours?: number | null;
  color?: string | null;
}

export async function createSubject(userId: string, input: CreateSubjectInput) {
  const now = nowIso();
  const subject: Subject = {
    id: newId(),
    user_id: userId,
    semester_id: input.semester_id,
    name: input.name,
    code: input.code ?? null,
    lecturer_name: input.lecturer_name ?? null,
    lecturer_id: input.lecturer_id ?? null,
    description: input.description ?? null,
    credit_hours: input.credit_hours ?? null,
    color: input.color ?? "#3366ff",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.subjects.add(subject);
  await enqueueChange("subjects", subject.id, "create", subject);
  return subject;
}

export async function updateSubject(id: string, changes: Partial<Subject>) {
  const updated_at = nowIso();
  await db.subjects.update(id, { ...changes, updated_at });
  const record = await db.subjects.get(id);
  if (record) await enqueueChange("subjects", id, "update", record);
  return record;
}

export async function deleteSubject(id: string) {
  const deleted_at = nowIso();
  await db.subjects.update(id, { deleted_at, updated_at: deleted_at });
  const record = await db.subjects.get(id);
  if (record) await enqueueChange("subjects", id, "delete", record);
}

export function listSubjectsForSemester(semesterId: string) {
  return db.subjects
    .where({ semester_id: semesterId })
    .filter((s) => s.deleted_at === null)
    .toArray();
}

export function listAllSubjectsForUser(userId: string) {
  return db.subjects
    .where({ user_id: userId })
    .filter((s) => s.deleted_at === null)
    .toArray();
}

export function listSubjectsForLecturer(lecturerId: string) {
  return db.subjects
    .where({ lecturer_id: lecturerId })
    .filter((s) => s.deleted_at === null)
    .toArray();
}

export function getSubject(id: string) {
  return db.subjects.get(id);
}
