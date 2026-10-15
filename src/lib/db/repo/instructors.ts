import { db } from "@/lib/db";
import type { AcademicTask, Lecturer, Subject } from "@/types/academic";

export interface InstructorSummary {
  lecturer: Lecturer;
  subjectCount: number;
  taskCount: number;
}

export async function getInstructorsOverview(userId: string): Promise<InstructorSummary[]> {
  const [lecturers, subjects, tasks] = await Promise.all([
    db.lecturers.where({ user_id: userId }).filter((l) => l.deleted_at === null).toArray(),
    db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.tasks.where({ user_id: userId }).filter((t) => t.deleted_at === null).toArray(),
  ]);

  const subjectsByLecturer = new Map<string, Subject[]>();
  for (const s of subjects) {
    if (!s.lecturer_id) continue;
    const list = subjectsByLecturer.get(s.lecturer_id) ?? [];
    list.push(s);
    subjectsByLecturer.set(s.lecturer_id, list);
  }

  const tasksBySubject = new Map<string, number>();
  for (const t of tasks) tasksBySubject.set(t.subject_id, (tasksBySubject.get(t.subject_id) ?? 0) + 1);

  return lecturers
    .map((lecturer) => {
      const own = subjectsByLecturer.get(lecturer.id) ?? [];
      const taskCount = own.reduce((sum, s) => sum + (tasksBySubject.get(s.id) ?? 0), 0);
      return { lecturer, subjectCount: own.length, taskCount };
    })
    .sort((a, b) => a.lecturer.name.localeCompare(b.lecturer.name));
}

export interface InstructorDetail {
  lecturer: Lecturer;
  subjects: Subject[];
  tasks: AcademicTask[];
  subjectNameById: Record<string, string>;
}

export async function getInstructorDetail(userId: string, lecturerId: string): Promise<InstructorDetail | null> {
  const lecturer = await db.lecturers.get(lecturerId);
  if (!lecturer || lecturer.user_id !== userId || lecturer.deleted_at !== null) return null;

  const subjects = await db.subjects
    .where({ lecturer_id: lecturerId })
    .filter((s) => s.deleted_at === null)
    .toArray();

  const subjectIds = new Set(subjects.map((s) => s.id));
  const tasks = (
    await db.tasks.where({ user_id: userId }).filter((t) => t.deleted_at === null).toArray()
  ).filter((t) => subjectIds.has(t.subject_id));

  return {
    lecturer,
    subjects,
    tasks,
    subjectNameById: Object.fromEntries(subjects.map((s) => [s.id, s.name])),
  };
}
