import { db } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { enqueueChange } from "@/lib/db/syncQueue";
import type { GradeCategory, GradeEntry } from "@/types/grades";

export interface GradeInput {
  subject_id: string;
  title: string;
  category: GradeCategory;
  score: number;
  max_score: number;
  weight: number | null;
  graded_on: string | null;
  notes: string | null;
}

export function listGrades(userId: string) {
  return db.gradeEntries.where({ user_id: userId }).filter((g) => g.deleted_at === null).toArray();
}

export async function createGrade(userId: string, input: GradeInput) {
  const now = nowIso();
  const entry: GradeEntry = { id: newId(), user_id: userId, ...input, created_at: now, updated_at: now, deleted_at: null };
  await db.gradeEntries.add(entry);
  await enqueueChange("grade_entries", entry.id, "create", entry);
  return entry;
}

export async function updateGrade(id: string, input: GradeInput) {
  await db.gradeEntries.update(id, { ...input, updated_at: nowIso() });
  const entry = await db.gradeEntries.get(id);
  if (entry) await enqueueChange("grade_entries", id, "update", entry);
  return entry;
}

export async function deleteGrade(id: string) {
  const deleted_at = nowIso();
  await db.gradeEntries.update(id, { deleted_at, updated_at: deleted_at });
  const entry = await db.gradeEntries.get(id);
  if (entry) await enqueueChange("grade_entries", id, "delete", entry);
}
