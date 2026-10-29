import { db } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { enqueueChange } from "@/lib/db/syncQueue";
import type { Exam, ExamType } from "@/types/exams";

export interface ExamInput {
  subject_id: string;
  title: string;
  exam_type: ExamType;
  exam_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  room: string | null;
  notes: string | null;
}

export function listExams(userId: string) {
  return db.exams.where({ user_id: userId }).filter((e) => e.deleted_at === null).toArray();
}

export async function createExam(userId: string, input: ExamInput) {
  const now = nowIso();
  const exam: Exam = { id: newId(), user_id: userId, ...input, created_at: now, updated_at: now, deleted_at: null };
  await db.exams.add(exam);
  await enqueueChange("exams", exam.id, "create", exam);
  return exam;
}

export async function updateExam(id: string, input: ExamInput) {
  await db.exams.update(id, { ...input, updated_at: nowIso() });
  const exam = await db.exams.get(id);
  if (exam) await enqueueChange("exams", id, "update", exam);
  return exam;
}

export async function deleteExam(id: string) {
  const deleted_at = nowIso();
  await db.exams.update(id, { deleted_at, updated_at: deleted_at });
  const exam = await db.exams.get(id);
  if (exam) await enqueueChange("exams", id, "delete", exam);
}
