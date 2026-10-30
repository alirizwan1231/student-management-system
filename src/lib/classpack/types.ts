import type { AcademicTask, ResourceType } from "@/types/academic";
import type { ExamType } from "@/types/exams";

// Everything a class pack carries: semester, subjects, instructors, timetable, notes (+ files), tasks, exams.
export interface PackSlot {
  day_of_week: number; // 0 = Monday ... 6 = Sunday
  start_time: string; // "09:00"
  end_time: string;
  room: string | null;
}

export interface PackFile {
  title: string;
  resource_type: ResourceType;
  url: string | null; // a web link
  pack_path: string | null; // while building: the publisher's own file path. In a published pack: the group's shared copy
}

export interface PackNote {
  key: string;
  title: string;
  lecture_number: number | null;
  lecture_date: string | null;
  short_summary: string | null;
  detailed_notes: string | null;
  keywords: string[];
  files: PackFile[];
}

export interface PackTask {
  key: string;
  title: string;
  description: string | null;
  task_type: AcademicTask["task_type"];
  priority: AcademicTask["priority"];
  deadline: string | null; // ISO date-time
  marks: number | null;
  files?: PackFile[]; // notes/files attached to the task (optional so packs published before this existed still import)
}

export interface PackExam {
  key: string;
  title: string;
  exam_type: ExamType;
  exam_date: string; // yyyy-MM-dd
  start_time: string | null;
  duration_minutes: number | null;
  room: string | null;
  notes: string | null;
}

export interface PackSubject {
  key: string; // the publisher's subject id (stable, used to track checkboxes)
  name: string;
  code: string | null;
  credit_hours: number | null;
  color: string | null;
  description: string | null;
  instructor: string | null; // instructor NAME (instructors are matched by name)
  slots: PackSlot[];
  notes?: PackNote[]; // optional so older packs still import
  tasks?: PackTask[];
  exams?: PackExam[];
}

export interface ClassPackPayload {
  schema: 1 | 2;
  semester: { name: string; number: number; start_date: string | null; end_date: string | null };
  subjects: PackSubject[];
}

export interface ClassPack {
  group_id: string;
  version: number;
  published_by: string;
  title: string;
  payload: ClassPackPayload;
  published_at: string;
}

export interface SubjectChoice {
  subject: boolean;
  instructor: boolean;
  timetable: boolean;
  notes: boolean;
  tasks: boolean;
  exams: boolean;
}
export type Selection = Record<string, SubjectChoice>;
export type ChoiceField = keyof SubjectChoice;

export function defaultChoice(s: PackSubject, on = true): SubjectChoice {
  return {
    subject: on,
    instructor: on && Boolean(s.instructor),
    timetable: on && s.slots.length > 0,
    notes: on && (s.notes?.length ?? 0) > 0,
    tasks: on && (s.tasks?.length ?? 0) > 0,
    exams: on && (s.exams?.length ?? 0) > 0,
  };
}

export function toggleChoice(cur: SubjectChoice, s: PackSubject, field: ChoiceField): SubjectChoice {
  if (field === "subject") return defaultChoice(s, !cur.subject);
  if (!cur.subject) return cur;
  return { ...cur, [field]: !cur[field] };
}

// "match": use my semester with the same name, or create it. "existing": put everything into a semester I already have.
export type ImportTarget = { mode: "match" } | { mode: "existing"; semesterId: string };

export interface ImportReport {
  semesterCreated: boolean;
  subjectsAdded: number;
  subjectsExisting: number;
  instructorsAdded: number;
  classesAdded: number;
  classesExisting: number;
  notesAdded: number;
  notesExisting: number;
  filesAdded: number;
  tasksAdded: number;
  tasksExisting: number;
  examsAdded: number;
  examsExisting: number;
  itemsUpdated: number; // items that changed in the pack and were updated here
  unchanged: number; // items that did not change since the last import
  conflicts: string[]; // items the student edited themselves: their version was kept
}

export interface ImportOptions {
  // pack subject key -> id of the student's OWN subject it should merge into ("" or missing = create new)
  subjectLinks?: Record<string, string>;
}

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
