import { db } from "@/lib/db";
import { createSemester } from "@/lib/db/repo/semesters";
import { createSubject, updateSubject } from "@/lib/db/repo/subjects";
import { createTimetableSlot } from "@/lib/db/repo/timetable";
import { findOrCreateLecturer } from "@/lib/db/repo/lecturers";
import { createLecture, updateLecture, deleteLecture } from "@/lib/db/repo/lectures";
import { createTask, updateTask, deleteTask } from "@/lib/db/repo/tasks";
import { createExam, updateExam, deleteExam } from "@/lib/db/repo/exams";
import { attachStoragePath, createResource, deleteResource } from "@/lib/db/repo/resources";
import { exactSubjectMatch } from "@/lib/classpack/match";
import { examCore, fp, noteCore, packHash, subjectCore, taskCore } from "@/lib/classpack/fingerprint";
import { readLinks, writeLinks, type PackLinks } from "@/lib/classpack/links";
import type { ClassPack, ImportOptions, ImportReport, ImportTarget, PackFile, Selection } from "@/lib/classpack/types";

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const slotKey = (day: number, start: string, end: string) => `${day}|${start.slice(0, 5)}|${end.slice(0, 5)}`;
const dayOf = (iso: string | null) => (iso && !Number.isNaN(new Date(iso).getTime()) ? new Date(iso).toISOString().slice(0, 10) : "");

// Deletes pack-copied files (this group's copies) whose parent is being
// removed, or that the publisher has taken out of the pack. The student's
// own uploads and web links are never touched.
async function prunePackResources(userId: string, groupId: string, parent: { lectureId?: string; taskId?: string }): Promise<number> {
  const rows = await db.resources
    .where({ user_id: userId })
    .filter((r) => r.deleted_at === null && (parent.lectureId ? r.lecture_id === parent.lectureId : r.task_id === parent.taskId))
    .toArray();
  let removed = 0;
  for (const r of rows) {
    const isPackCopy = Boolean(r.storage_path?.startsWith(`pack:${groupId}:`));
    const isNoteLink = parent.taskId !== undefined && r.resource_type === "link" && Boolean(r.url?.startsWith("/notes/lecture/"));
    if (isPackCopy || isNoteLink) {
      await deleteResource(r.id).catch(() => undefined);
      removed += 1;
    }
  }
  return removed;
}

async function attachFiles(userId: string, groupId: string, subjectId: string, lectureId: string, files: PackFile[]): Promise<{ added: number; pruned: number }> {
  const have = await db.resources.where({ user_id: userId }).filter((r) => r.deleted_at === null && r.lecture_id === lectureId).toArray();
  const titles = new Set(have.map((r) => norm(r.title)));
  let added = 0;
  for (const f of files) {
    if (titles.has(norm(f.title))) continue;
    const res = await createResource(userId, { subject_id: subjectId, lecture_id: lectureId, title: f.title, url: f.url, resource_type: f.resource_type });
    if (!f.url && f.pack_path) await attachStoragePath(res.id, `pack:${groupId}:${f.pack_path}`);
    titles.add(norm(f.title));
    added += 1;
  }
  // Files the publisher removed from this note since the last import go
  // away here too (only this group's pack copies -- see prunePackResources).
  const packTitles = new Set(files.map((f) => norm(f.title)));
  let pruned = 0;
  for (const r of have) {
    if (r.storage_path?.startsWith(`pack:${groupId}:`) && !packTitles.has(norm(r.title))) {
      await deleteResource(r.id).catch(() => undefined);
      pruned += 1;
    }
  }
  return { added, pruned };
}

// Same as attachFiles, but for a task's own notes/attachments: the imported
// copies hang off the imported task (and its subject), exactly like the
// publisher's originals. A file can also be a reference to one of the
// pack's lecture notes (note_key): the attachment then becomes a link to
// THIS account's imported copy of that note -- the publisher's internal
// note URL would point at a note that does not exist here. Notes are
// imported before tasks, so their links are already known at this point.
async function attachTaskFiles(userId: string, groupId: string, subjectId: string, taskId: string, files: PackFile[], links: PackLinks): Promise<{ added: number; pruned: number }> {
  const have = await db.resources.where({ user_id: userId }).filter((r) => r.deleted_at === null && r.task_id === taskId).toArray();
  const titles = new Set(have.map((r) => norm(r.title)));
  let added = 0;
  for (const f of files) {
    if (f.note_key) {
      const noteLink = links.items[f.note_key];
      if (noteLink?.kind !== "note") continue; // the note itself was not imported: nothing valid to point at
      const wantUrl = `/notes/lecture/${noteLink.localId}`;
      const dupe = have.find((r) => norm(r.title) === norm(f.title));
      if (dupe) {
        // Packs published before note references existed saved this
        // attachment as a link into the PUBLISHER's account, which can
        // never open here -- replace it with the correct local link.
        // Anything else with the same title is already attached: keep it.
        if (dupe.resource_type === "link" && dupe.url && dupe.url !== wantUrl && dupe.url.startsWith("/notes/lecture/")) {
          await deleteResource(dupe.id).catch(() => undefined);
        } else {
          continue;
        }
      }
      await createResource(userId, { task_id: taskId, title: f.title, url: wantUrl, resource_type: "link" });
      titles.add(norm(f.title));
      added += 1;
      continue;
    }
    if (titles.has(norm(f.title))) continue;
    const res = await createResource(userId, { subject_id: subjectId, task_id: taskId, title: f.title, url: f.url, resource_type: f.resource_type });
    if (!f.url && f.pack_path) await attachStoragePath(res.id, `pack:${groupId}:${f.pack_path}`);
    titles.add(norm(f.title));
    added += 1;
  }
  // Attachments the publisher removed from this task since the last
  // import go away here too: this group's pack copies whose title is no
  // longer in the pack, and note-links pointing at imported notes the
  // pack no longer attaches to this task. The student's own uploads and
  // links are never touched.
  const packTitles = new Set(files.map((f) => norm(f.title)));
  const wantedNoteUrls = new Set(
    files
      .filter((f) => f.note_key && links.items[f.note_key]?.kind === "note")
      .map((f) => `/notes/lecture/${links.items[f.note_key!].localId}`)
  );
  const importedNoteUrls = new Set(
    Object.values(links.items)
      .filter((l) => l.kind === "note")
      .map((l) => `/notes/lecture/${l.localId}`)
  );
  let pruned = 0;
  for (const r of have) {
    if (r.storage_path?.startsWith(`pack:${groupId}:`) && !packTitles.has(norm(r.title))) {
      await deleteResource(r.id).catch(() => undefined);
      pruned += 1;
    } else if (r.resource_type === "link" && r.url && importedNoteUrls.has(r.url) && !wantedNoteUrls.has(r.url) && !packTitles.has(norm(r.title))) {
      await deleteResource(r.id).catch(() => undefined);
      pruned += 1;
    }
  }
  return { added, pruned };
}

// Copies the ticked items into the student's OWN account (normal repo functions, so everything syncs).
// Safe to run again and again:
//  - items already imported and unchanged in the pack are skipped,
//  - items the pack CHANGED are updated here, but only if the student did not edit them,
//  - items the student edited are kept as they are and listed in report.conflicts.
export async function importPack(userId: string, pack: ClassPack, selection: Selection, target: ImportTarget, options: ImportOptions = {}): Promise<ImportReport> {
  const { payload, group_id: groupId } = pack;
  const report: ImportReport = {
    semesterCreated: false,
    subjectsAdded: 0,
    subjectsExisting: 0,
    instructorsAdded: 0,
    classesAdded: 0,
    classesExisting: 0,
    notesAdded: 0,
    notesExisting: 0,
    filesAdded: 0,
    tasksAdded: 0,
    tasksExisting: 0,
    examsAdded: 0,
    examsExisting: 0,
    itemsUpdated: 0,
    unchanged: 0,
    conflicts: [],
    removed: [],
    filesRemoved: 0,
  };
  const links: PackLinks = (await readLinks(groupId)) ?? { version: 0, items: {} };
  // For the removal pass at the end: which pack items this run actually
  // covers (present), and which subjects had each category switched on
  // (scope). Items outside the scope -- a category the student unticked in
  // the import panel, or a subject that is not part of this run -- are
  // never treated as removed.
  const present = new Set<string>();
  const scopeNotes = new Set<string>();
  const scopeTasks = new Set<string>();
  const scopeExams = new Set<string>();

  // 1. semester
  let semesterId: string;
  if (target.mode === "existing") {
    semesterId = target.semesterId;
  } else {
    const found = await db.semesters.where({ user_id: userId }).filter((s) => s.deleted_at === null && norm(s.name) === norm(payload.semester.name)).first();
    if (found) {
      semesterId = found.id;
    } else {
      const created = await createSemester(userId, { name: payload.semester.name, number: payload.semester.number, start_date: payload.semester.start_date, end_date: payload.semester.end_date });
      semesterId = created.id;
      report.semesterCreated = true;
    }
  }

  const mySubjects = await db.subjects.where({ user_id: userId }).filter((s) => s.deleted_at === null && s.semester_id === semesterId).toArray();

  for (const item of payload.subjects) {
    const choice = selection[item.key];
    if (!choice?.subject) continue;
    present.add(item.key);
    if (choice.notes) scopeNotes.add(item.key);
    if (choice.tasks) scopeTasks.add(item.key);
    if (choice.exams) scopeExams.add(item.key);

    // 2. instructor (matched by name, created only if missing)
    let lecturerId: string | null = null;
    let lecturerName: string | null = null;
    if (choice.instructor && item.instructor) {
      const had = (await db.lecturers.where({ user_id: userId }).filter((l) => l.deleted_at === null && norm(l.name) === norm(item.instructor)).count()) > 0;
      const lecturer = await findOrCreateLecturer(userId, item.instructor);
      if (lecturer) {
        lecturerId = lecturer.id;
        lecturerName = lecturer.name;
        if (!had) report.instructorsAdded += 1;
      }
    }

    // 3. subject: my linked copy -> the one the student chose -> same name -> create
    const subjectHash = packHash.subject(item);
    const subjectLink = links.items[item.key];
    let local = subjectLink?.kind === "subject" ? await db.subjects.get(subjectLink.localId) : undefined;
    if (local?.deleted_at) local = undefined;
    const linked = Boolean(local);
    if (!local) {
      const chosenId = options.subjectLinks?.[item.key];
      const chosen = chosenId ? mySubjects.find((s) => s.id === chosenId) ?? (await db.subjects.get(chosenId)) : undefined;
      local = chosen && !chosen.deleted_at ? chosen : exactSubjectMatch(item, mySubjects);
    }

    let subjectId: string;
    if (local) {
      subjectId = local.id;
      if (linked && subjectLink.packHash === subjectHash) {
        report.unchanged += 1;
      } else if (linked && subjectLink.localFp !== fp(subjectCore(local))) {
        report.conflicts.push(item.name); // I edited this subject myself: keep my version
      } else if (linked) {
        await updateSubject(local.id, {
          name: item.name,
          code: item.code,
          credit_hours: item.credit_hours,
          color: item.color,
          description: item.description,
          ...(lecturerId ? { lecturer_id: lecturerId, lecturer_name: lecturerName } : {}),
        });
        report.itemsUpdated += 1;
      } else {
        report.subjectsExisting += 1; // already had it: just link it
      }
    } else {
      const created = await createSubject(userId, {
        semester_id: semesterId,
        name: item.name,
        code: item.code,
        lecturer_name: lecturerName,
        lecturer_id: lecturerId,
        description: item.description,
        credit_hours: item.credit_hours,
        color: item.color,
      });
      mySubjects.push(created);
      subjectId = created.id;
      report.subjectsAdded += 1;
    }
    const nowLocal = await db.subjects.get(subjectId);
    if (nowLocal) links.items[item.key] = { kind: "subject", localId: subjectId, packHash: subjectHash, localFp: fp(subjectCore(nowLocal)) };

    // 4. timetable (only ADDS classes at new day/time combinations)
    if (choice.timetable && item.slots.length > 0) {
      const have = await db.timetableSlots.where({ user_id: userId }).filter((sl) => sl.deleted_at === null && sl.subject_id === subjectId).toArray();
      const keys = new Set(have.map((sl) => slotKey(sl.day_of_week, sl.start_time, sl.end_time)));
      for (const sl of item.slots) {
        const key = slotKey(sl.day_of_week, sl.start_time, sl.end_time);
        if (keys.has(key)) {
          report.classesExisting += 1;
          continue;
        }
        await createTimetableSlot(userId, { subject_id: subjectId, day_of_week: sl.day_of_week, start_time: sl.start_time, end_time: sl.end_time, room: sl.room, lecturer_id: lecturerId });
        keys.add(key);
        report.classesAdded += 1;
      }
    }

    // 5. notes (and their files)
    if (choice.notes && (item.notes?.length ?? 0) > 0) {
      const have = await db.lectures.where({ user_id: userId }).filter((l) => l.deleted_at === null && l.subject_id === subjectId).toArray();
      for (const note of item.notes ?? []) {
        present.add(note.key);
        const hash = packHash.note(note);
        const link = links.items[note.key];
        let lec = link?.kind === "note" ? await db.lectures.get(link.localId) : undefined;
        if (lec?.deleted_at) lec = undefined;
        const noteLinked = Boolean(lec);
        if (!lec) lec = have.find((l) => norm(l.title) === norm(note.title) && (l.lecture_number ?? "") === (note.lecture_number ?? ""));

        let lectureId: string;
        if (lec) {
          lectureId = lec.id;
          if (noteLinked && link.packHash === hash) {
            report.unchanged += 1;
            continue;
          } else if (noteLinked && link.localFp !== fp(noteCore(lec))) {
            report.conflicts.push(note.title);
          } else if (noteLinked) {
            await updateLecture(lec.id, {
              title: note.title,
              lecture_number: note.lecture_number,
              lecture_date: note.lecture_date,
              short_summary: note.short_summary,
              detailed_notes: note.detailed_notes,
              keywords: note.keywords,
            });
            const att = await attachFiles(userId, groupId, subjectId, lectureId, note.files);
            report.filesAdded += att.added;
            report.filesRemoved += att.pruned;
            report.itemsUpdated += 1;
          } else {
            report.notesExisting += 1;
          }
        } else {
          const created = await createLecture(userId, {
            subject_id: subjectId,
            lecture_number: note.lecture_number,
            title: note.title,
            lecture_date: note.lecture_date,
            short_summary: note.short_summary,
            detailed_notes: note.detailed_notes,
            keywords: note.keywords,
          });
          lectureId = created.id;
          have.push(created);
          report.notesAdded += 1;
          const att = await attachFiles(userId, groupId, subjectId, lectureId, note.files);
            report.filesAdded += att.added;
            report.filesRemoved += att.pruned;
        }
        const fresh = await db.lectures.get(lectureId);
        if (fresh) links.items[note.key] = { kind: "note", localId: lectureId, packHash: hash, localFp: fp(noteCore(fresh)) };
      }
    }

    // 6. tasks
    if (choice.tasks && (item.tasks?.length ?? 0) > 0) {
      const have = await db.tasks.where({ user_id: userId }).filter((t) => t.deleted_at === null && t.subject_id === subjectId).toArray();
      for (const t of item.tasks ?? []) {
        present.add(t.key);
        const hash = packHash.task(t);
        const link = links.items[t.key];
        let task = link?.kind === "task" ? await db.tasks.get(link.localId) : undefined;
        if (task?.deleted_at) task = undefined;
        const taskLinked = Boolean(task);
        if (!task) task = have.find((x) => norm(x.title) === norm(t.title) && dayOf(x.deadline) === dayOf(t.deadline));

        let taskId: string | undefined;
        if (task) {
          taskId = task.id;
          if (taskLinked && link.packHash === hash) {
            report.unchanged += 1;
            continue;
          } else if (taskLinked && link.localFp !== fp(taskCore(task))) {
            report.conflicts.push(t.title);
          } else if (taskLinked) {
            await updateTask(task.id, { title: t.title, description: t.description, task_type: t.task_type, priority: t.priority, deadline: t.deadline, marks: t.marks });
            // The pack's hash covers the task's files, so reaching this
            // branch also means "files may have changed": (re)attach any
            // that are missing -- this is what repairs tasks imported by
            // older versions, whose attachments never made it across.
            const att = await attachTaskFiles(userId, groupId, subjectId, task.id, t.files ?? [], links);
            report.filesAdded += att.added;
            report.filesRemoved += att.pruned;
            report.itemsUpdated += 1;
          } else {
            report.tasksExisting += 1;
          }
        } else {
          const created = (await createTask(userId, { subject_id: subjectId, title: t.title, description: t.description, task_type: t.task_type, deadline: t.deadline, priority: t.priority, marks: t.marks })) as { id?: string } | undefined;
          taskId =
            created?.id ??
            (await db.tasks.where({ user_id: userId }).filter((x) => x.deleted_at === null && x.subject_id === subjectId && norm(x.title) === norm(t.title)).last())?.id;
          report.tasksAdded += 1;
          if (taskId) {
            const att = await attachTaskFiles(userId, groupId, subjectId, taskId, t.files ?? [], links);
            report.filesAdded += att.added;
            report.filesRemoved += att.pruned;
          }
        }
        const fresh = taskId ? await db.tasks.get(taskId) : undefined;
        if (fresh) {
          have.push(fresh);
          links.items[t.key] = { kind: "task", localId: fresh.id, packHash: hash, localFp: fp(taskCore(fresh)) };
        }
      }
    }

    // 7. exams
    if (choice.exams && (item.exams?.length ?? 0) > 0) {
      const have = await db.exams.where({ user_id: userId }).filter((e) => e.deleted_at === null && e.subject_id === subjectId).toArray();
      for (const e of item.exams ?? []) {
        present.add(e.key);
        const hash = packHash.exam(e);
        const link = links.items[e.key];
        let exam = link?.kind === "exam" ? await db.exams.get(link.localId) : undefined;
        if (exam?.deleted_at) exam = undefined;
        const examLinked = Boolean(exam);
        if (!exam) exam = have.find((x) => norm(x.title) === norm(e.title) && x.exam_date === e.exam_date);

        const input = {
          subject_id: subjectId,
          title: e.title,
          exam_type: e.exam_type,
          exam_date: e.exam_date,
          start_time: e.start_time,
          duration_minutes: e.duration_minutes,
          room: e.room,
          notes: e.notes,
        };
        let examId: string;
        if (exam) {
          examId = exam.id;
          if (examLinked && link.packHash === hash) {
            report.unchanged += 1;
            continue;
          } else if (examLinked && link.localFp !== fp(examCore(exam))) {
            report.conflicts.push(e.title);
          } else if (examLinked) {
            await updateExam(exam.id, input);
            report.itemsUpdated += 1;
          } else {
            report.examsExisting += 1;
          }
        } else {
          const created = await createExam(userId, input);
          examId = created.id;
          report.examsAdded += 1;
        }
        const fresh = await db.exams.get(examId);
        if (fresh) {
          have.push(fresh);
          links.items[e.key] = { kind: "exam", localId: examId, packHash: hash, localFp: fp(examCore(fresh)) };
        }
      }
    }
  }

  // 8. removals: items that were imported from this pack before but are no
  // longer in it -- the publisher deselected or deleted them, so they come
  // out here too, as the publisher expects. Safety rules, in order:
  //  - only notes/tasks/exams (whole subjects are never auto-deleted),
  //  - only when this run actually covered that item's subject + category,
  //  - only when the student has NOT edited their copy since importing it
  //    (fingerprint check). An edited copy is kept and simply unlinked, so
  //    it becomes fully the student's own and is never managed again.
  const subjectKeyByLocalId = new Map<string, string>();
  for (const [k, v] of Object.entries(links.items)) if (v.kind === "subject") subjectKeyByLocalId.set(v.localId, k);
  for (const [key, link] of Object.entries({ ...links.items })) {
    if (link.kind === "subject" || present.has(key)) continue;
    const scope = link.kind === "note" ? scopeNotes : link.kind === "task" ? scopeTasks : scopeExams;
    if (link.kind === "note") {
      const local = await db.lectures.get(link.localId);
      if (!local || local.deleted_at) {
        delete links.items[key];
        continue;
      }
      const subjectKey = subjectKeyByLocalId.get(local.subject_id);
      if (!subjectKey || !scope.has(subjectKey)) continue; // not covered by this import: leave it alone
      if (fp(noteCore(local)) !== link.localFp) {
        report.conflicts.push(local.title); // the student edited it: keep their copy
        delete links.items[key];
        continue;
      }
      await deleteLecture(local.id);
      report.filesRemoved += await prunePackResources(userId, groupId, { lectureId: local.id });
      report.removed.push(local.title);
      delete links.items[key];
    } else if (link.kind === "task") {
      const local = await db.tasks.get(link.localId);
      if (!local || local.deleted_at) {
        delete links.items[key];
        continue;
      }
      const subjectKey = subjectKeyByLocalId.get(local.subject_id);
      if (!subjectKey || !scope.has(subjectKey)) continue;
      if (fp(taskCore(local)) !== link.localFp) {
        report.conflicts.push(local.title);
        delete links.items[key];
        continue;
      }
      await deleteTask(local.id);
      report.filesRemoved += await prunePackResources(userId, groupId, { taskId: local.id });
      report.removed.push(local.title);
      delete links.items[key];
    } else {
      const local = await db.exams.get(link.localId);
      if (!local || local.deleted_at) {
        delete links.items[key];
        continue;
      }
      const subjectKey = subjectKeyByLocalId.get(local.subject_id);
      if (!subjectKey || !scope.has(subjectKey)) continue;
      if (fp(examCore(local)) !== link.localFp) {
        report.conflicts.push(local.title);
        delete links.items[key];
        continue;
      }
      await deleteExam(local.id);
      report.removed.push(local.title);
      delete links.items[key];
    }
  }

  links.version = pack.version;
  await writeLinks(groupId, links);
  return report;
}
