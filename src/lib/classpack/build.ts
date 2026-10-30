import { db } from "@/lib/db";
import type { ClassPackPayload, PackFile, PackSubject, Selection } from "@/lib/classpack/types";
import type { Resource } from "@/types/academic";

const hhmm = (t: string) => t.slice(0, 5);
const isoOrNull = (v: string | null) => (v && !Number.isNaN(new Date(v).getTime()) ? new Date(v).toISOString() : null);

export interface BuiltPack {
  payload: ClassPackPayload;
  skippedFiles: number; // files still waiting to upload (not in the cloud yet), so they cannot be shared
}

// Reads the publisher's own data for one semester and turns it into a pack.
export async function buildPack(userId: string, semesterId: string): Promise<BuiltPack | null> {
  const semester = await db.semesters.get(semesterId);
  if (!semester || semester.deleted_at) return null;

  const subjects = (
    await db.subjects.where({ user_id: userId }).filter((s) => s.semester_id === semesterId && s.deleted_at === null).toArray()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const slots = await db.timetableSlots.where({ user_id: userId }).filter((s) => s.deleted_at === null).toArray();
  const lectures = await db.lectures.where({ user_id: userId }).filter((l) => l.deleted_at === null).toArray();
  const resources = await db.resources.where({ user_id: userId }).filter((r) => r.deleted_at === null).toArray();
  const tasks = await db.tasks.where({ user_id: userId }).filter((t) => t.deleted_at === null).toArray();
  const exams = await db.exams.where({ user_id: userId }).filter((e) => e.deleted_at === null).toArray();

  let skippedFiles = 0;
  // A resource becomes a pack file when it is a web link, or when its file
  // is fully uploaded under the publisher's own "users/" path. Anything
  // else (still uploading, or itself an imported pack copy) is skipped.
  // A task attachment can also be an internal link to one of the subject's
  // own lecture notes (created when a text-only note is ticked in the Add
  // Task form): that URL only exists in the publisher's account, so it is
  // packed as a note_key reference instead and re-pointed at import time.
  const toPackFiles = (rs: Resource[], noteIds?: Set<string>): PackFile[] =>
    rs.flatMap((r): PackFile[] => {
      if (r.url) {
        const noteMatch = r.url.match(/^\/notes\/lecture\/(.+)$/);
        if (noteMatch) {
          if (noteIds?.has(noteMatch[1])) return [{ title: r.title, resource_type: "link", url: null, pack_path: null, note_key: noteMatch[1] }];
          skippedFiles += 1; // points at a note that is not part of this pack
          return [];
        }
        return [{ title: r.title, resource_type: r.resource_type, url: r.url, pack_path: null }];
      }
      if (r.storage_path && r.storage_path.startsWith("users/")) return [{ title: r.title, resource_type: r.resource_type, url: null, pack_path: r.storage_path }];
      // A file the publisher themselves imported from another group's pack
      // (stored as "pack:<groupId>:<path>"): include it too, so a note
      // attached to a task travels onward instead of being silently
      // dropped. The publish endpoint re-checks that the publisher belongs
      // to the source group before copying it.
      const packCopy = r.storage_path?.match(/^pack:[^:]+:(packs\/.+)$/);
      if (packCopy) return [{ title: r.title, resource_type: r.resource_type, url: null, pack_path: packCopy[1] }];
      skippedFiles += 1;
      return [];
    });

  const out: PackSubject[] = [];
  for (const s of subjects) {
    let instructor = s.lecturer_name?.trim() || null;
    if (!instructor && s.lecturer_id) instructor = (await db.lecturers.get(s.lecturer_id))?.name?.trim() || null;
    const subjectNoteIds = new Set(lectures.filter((l) => l.subject_id === s.id).map((l) => l.id));

    out.push({
      key: s.id,
      name: s.name,
      code: s.code,
      credit_hours: s.credit_hours,
      color: s.color,
      description: s.description,
      instructor,
      slots: slots
        .filter((sl) => sl.subject_id === s.id)
        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
        .map((sl) => ({ day_of_week: sl.day_of_week, start_time: hhmm(sl.start_time), end_time: hhmm(sl.end_time), room: sl.room })),
      notes: lectures
        .filter((l) => l.subject_id === s.id)
        .sort((a, b) => (a.lecture_number ?? 9999) - (b.lecture_number ?? 9999) || a.title.localeCompare(b.title))
        .map((l) => ({
          key: l.id,
          title: l.title,
          lecture_number: l.lecture_number,
          lecture_date: l.lecture_date,
          short_summary: l.short_summary,
          detailed_notes: l.detailed_notes,
          keywords: l.keywords ?? [],
          files: toPackFiles(resources.filter((r) => r.lecture_id === l.id)),
        })),
      tasks: tasks
        .filter((t) => t.subject_id === s.id)
        .map((t) => ({
          key: t.id,
          title: t.title,
          description: t.description,
          task_type: t.task_type,
          priority: t.priority,
          deadline: isoOrNull(t.deadline),
          marks: t.marks,
          // The task's own notes/attachments (Preparation notes, uploads) --
          // these used to be left out of the pack entirely, so imported
          // tasks arrived without their notes.
          files: toPackFiles(resources.filter((r) => r.task_id === t.id), subjectNoteIds),
        })),
      exams: exams
        .filter((e) => e.subject_id === s.id)
        .sort((a, b) => a.exam_date.localeCompare(b.exam_date))
        .map((e) => ({
          key: e.id,
          title: e.title,
          exam_type: e.exam_type,
          exam_date: e.exam_date,
          start_time: e.start_time ? e.start_time.slice(0, 5) : null,
          duration_minutes: e.duration_minutes,
          room: e.room,
          notes: e.notes,
        })),
    });
  }

  return {
    payload: { schema: 2, semester: { name: semester.name, number: semester.number, start_date: semester.start_date, end_date: semester.end_date }, subjects: out },
    skippedFiles,
  };
}

// Keeps only what the publisher ticked (categories per subject, and single items inside them).
export function applySelection(payload: ClassPackPayload, selection: Selection, itemSel: Record<string, boolean>): ClassPackPayload {
  const keep = <T extends { key: string }>(list: T[] | undefined, on: boolean): T[] => (on ? (list ?? []).filter((i) => itemSel[i.key] !== false) : []);
  return {
    ...payload,
    subjects: payload.subjects
      .filter((s) => selection[s.key]?.subject)
      .map((s) => {
        const c = selection[s.key];
        return {
          ...s,
          instructor: c.instructor ? s.instructor : null,
          slots: c.timetable ? s.slots : [],
          notes: keep(s.notes, c.notes),
          tasks: keep(s.tasks, c.tasks),
          exams: keep(s.exams, c.exams),
        };
      }),
  };
}
