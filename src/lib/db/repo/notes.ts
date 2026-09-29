import { db } from "@/lib/db";
import type { Lecture, Semester, Subject } from "@/types/academic";
import { deleteLecture } from "@/lib/db/repo/lectures";
import { deleteResource } from "@/lib/db/repo/resources";
import { listPendingUploadsForResource, removePendingUpload } from "@/lib/db/repo/pendingUploads";

// Read/aggregate helpers for the Notes area. Notes ARE lectures (the
// `lectures` table) -- there is deliberately no second table.

export interface SubjectNotesSummary {
  subject: Subject;
  semester: Semester | null;
  lectureCount: number;
  fileCount: number;
  lastUpdated: string | null;
}

export interface NotesOverview {
  semesters: Semester[];
  summaries: SubjectNotesSummary[];
  lectures: Lecture[];
  subjectById: Record<string, Subject>;
}

export async function getNotesOverview(userId: string): Promise<NotesOverview> {
  const [semesters, subjects, lectures, resources] = await Promise.all([
    db.semesters.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.lectures.where({ user_id: userId }).filter((l) => l.deleted_at === null).toArray(),
    db.resources.where({ user_id: userId }).filter((r) => r.deleted_at === null && !!r.lecture_id).toArray(),
  ]);

  semesters.sort((a, b) => a.number - b.number);

  const semesterById = new Map<string, Semester>(semesters.map((s): [string, Semester] => [s.id, s]));
  const lectureSubject = new Map<string, string>(lectures.map((l): [string, string] => [l.id, l.subject_id]));

  const lecturesBySubject = new Map<string, Lecture[]>();
  for (const l of lectures) {
    const list = lecturesBySubject.get(l.subject_id) ?? [];
    list.push(l);
    lecturesBySubject.set(l.subject_id, list);
  }

  const filesBySubject = new Map<string, number>();
  for (const r of resources) {
    const subjectId = r.lecture_id ? lectureSubject.get(r.lecture_id) : undefined;
    if (subjectId) filesBySubject.set(subjectId, (filesBySubject.get(subjectId) ?? 0) + 1);
  }

  const summaries: SubjectNotesSummary[] = subjects.map((subject) => {
    const own = lecturesBySubject.get(subject.id) ?? [];
    const lastUpdated = own.reduce<string | null>(
      (latest, l) => (latest === null || l.updated_at > latest ? l.updated_at : latest),
      null
    );
    return {
      subject,
      semester: semesterById.get(subject.semester_id) ?? null,
      lectureCount: own.length,
      fileCount: filesBySubject.get(subject.id) ?? 0,
      lastUpdated,
    };
  });

  summaries.sort((a, b) => {
    const sa = a.semester?.number ?? 0;
    const sb = b.semester?.number ?? 0;
    if (sa !== sb) return sb - sa;
    return a.subject.name.localeCompare(b.subject.name);
  });

  return {
    semesters,
    summaries,
    lectures,
    subjectById: Object.fromEntries(subjects.map((s) => [s.id, s])),
  };
}

export interface RecentNote {
  lecture: Lecture;
  subjectName: string;
  subjectColor: string;
}

export async function getRecentNotes(userId: string, limit = 5): Promise<RecentNote[]> {
  const [subjects, lectures] = await Promise.all([
    db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray(),
    db.lectures.where({ user_id: userId }).filter((l) => l.deleted_at === null).toArray(),
  ]);
  const byId = new Map<string, Subject>(subjects.map((s): [string, Subject] => [s.id, s]));
  return lectures
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, limit)
    .map((lecture) => ({
      lecture,
      subjectName: byId.get(lecture.subject_id)?.name ?? "Subject",
      subjectColor: byId.get(lecture.subject_id)?.color || "#3366ff",
    }));
}

export async function getFileCountsByLecture(userId: string): Promise<Record<string, number>> {
  const resources = await db.resources
    .where({ user_id: userId })
    .filter((r) => r.deleted_at === null && !!r.lecture_id)
    .toArray();
  const counts: Record<string, number> = {};
  for (const r of resources) {
    if (r.lecture_id) counts[r.lecture_id] = (counts[r.lecture_id] ?? 0) + 1;
  }
  return counts;
}

// Deleting notes also removes their attachments (and any not-yet-uploaded
// file blobs), so nothing is left orphaned or uploaded later.
export async function deleteNote(lectureId: string): Promise<void> {
  const resources = await db.resources
    .where({ lecture_id: lectureId })
    .filter((r) => r.deleted_at === null)
    .toArray();
  for (const r of resources) {
    const pending = await listPendingUploadsForResource(r.id);
    for (const upload of pending) await removePendingUpload(upload.id);
    await deleteResource(r.id);
  }
  await deleteLecture(lectureId);
}
