import { db } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { enqueueChange } from "@/lib/db/syncQueue";
import type { Lecture } from "@/types/academic";

export interface CreateLectureInput {
  subject_id: string;
  lecture_number?: number | null;
  title: string;
  lecture_date?: string | null;
  detailed_notes?: string | null;
  short_summary?: string | null;
  keywords?: string[];
}

export async function createLecture(userId: string, input: CreateLectureInput) {
  const now = nowIso();
  const lecture: Lecture = {
    id: newId(),
    user_id: userId,
    subject_id: input.subject_id,
    lecture_number: input.lecture_number ?? null,
    title: input.title,
    lecture_date: input.lecture_date ?? null,
    detailed_notes: input.detailed_notes ?? null,
    short_summary: input.short_summary ?? null,
    keywords: input.keywords ?? [],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.lectures.add(lecture);
  await enqueueChange("lectures", lecture.id, "create", lecture);
  return lecture;
}

export async function updateLecture(id: string, changes: Partial<Lecture>) {
  const updated_at = nowIso();
  await db.lectures.update(id, { ...changes, updated_at });
  const record = await db.lectures.get(id);
  if (record) await enqueueChange("lectures", id, "update", record);
  return record;
}

export async function deleteLecture(id: string) {
  const deleted_at = nowIso();
  await db.lectures.update(id, { deleted_at, updated_at: deleted_at });
  const record = await db.lectures.get(id);
  if (record) await enqueueChange("lectures", id, "delete", record);
}

export function listLecturesForSubject(subjectId: string) {
  return db.lectures
    .where({ subject_id: subjectId })
    .filter((l) => l.deleted_at === null)
    .toArray()
    .then((rows) => rows.sort((a, b) => (a.lecture_number ?? 0) - (b.lecture_number ?? 0)));
}

export function getLecture(id: string) {
  return db.lectures.get(id);
}

export function listLecturesByDate(userId: string, dateIso: string) {
  // dateIso expected as 'YYYY-MM-DD'
  return db.lectures
    .where({ user_id: userId })
    .filter((l) => l.deleted_at === null && l.lecture_date === dateIso)
    .toArray();
}
