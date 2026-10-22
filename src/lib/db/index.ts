// Dexie (IndexedDB) database -- the UI's local source of truth.
import Dexie, { type Table } from "dexie";
import type {
  Semester,
  Subject,
  Lecture,
  AcademicTask,
  Resource,
  Lecturer,
  SyncQueueEntry,
} from "@/types/academic";
import type { TimetableSlot, TimetableException } from "@/types/timetable";
import type { AttendanceRecord } from "@/types/attendance";
import type { Exam } from "@/types/exams";
import type { GradeEntry } from "@/types/grades";
export interface PendingUpload {
  id: string;
  resource_id: string;
  user_id: string;
  file_name: string;
  file_blob: Blob;
  status: "pending" | "uploading" | "failed" | "done";
  attempts: number;
  last_error: string | null;
  created_at: string;
  file_size?: number;
  file_type?: string;
  next_attempt_at?: string | null; // failed uploads wait before the next automatic retry
  started_at?: string | null; // when this upload was claimed (detects a crashed upload)
  completed_at?: string | null;
  storage_path?: string | null; // set as soon as the file is in storage, so a retry never uploads twice
}
export interface MetaEntry {
  key: string;
  value: string;
}
export class UniversityManagerDB extends Dexie {
  semesters!: Table<Semester, string>;
  subjects!: Table<Subject, string>;
  lectures!: Table<Lecture, string>;
  tasks!: Table<AcademicTask, string>;
  resources!: Table<Resource, string>;
  lecturers!: Table<Lecturer, string>;
  timetableSlots!: Table<TimetableSlot, string>;
  timetableExceptions!: Table<TimetableException, string>;
  attendanceRecords!: Table<AttendanceRecord, string>;
  exams!: Table<Exam, string>;
  gradeEntries!: Table<GradeEntry, string>;
  pendingUploads!: Table<PendingUpload, string>;
  syncQueue!: Table<SyncQueueEntry, string>;
  meta!: Table<MetaEntry, string>;
  constructor() {
    super("university-manager");
    this.version(1).stores({
      semesters: "id, user_id, is_active, deleted_at, updated_at",
      subjects: "id, user_id, semester_id, deleted_at, updated_at",
      lectures: "id, user_id, subject_id, lecture_date, deleted_at, updated_at",
      tasks: "id, user_id, subject_id, deadline, status, deleted_at, updated_at",
      resources: "id, user_id, subject_id, lecture_id, deleted_at, updated_at",
      pendingUploads: "id, resource_id, status",
      syncQueue: "id, table_name, record_id, status, client_updated_at",
      meta: "key",
    });
    this.version(2).stores({
      semesters: "id, user_id, is_active, deleted_at, updated_at",
      subjects: "id, user_id, semester_id, lecturer_id, deleted_at, updated_at",
      lectures: "id, user_id, subject_id, lecture_date, deleted_at, updated_at",
      tasks: "id, user_id, subject_id, deadline, status, deleted_at, updated_at",
      resources: "id, user_id, subject_id, lecture_id, task_id, deleted_at, updated_at",
      lecturers: "id, user_id, deleted_at, updated_at",
      pendingUploads: "id, resource_id, status",
      syncQueue: "id, table_name, record_id, status, client_updated_at",
      meta: "key",
    });
    // v3: timetable slots
    this.version(3).stores({
      semesters: "id, user_id, is_active, deleted_at, updated_at",
      subjects: "id, user_id, semester_id, lecturer_id, deleted_at, updated_at",
      lectures: "id, user_id, subject_id, lecture_date, deleted_at, updated_at",
      tasks: "id, user_id, subject_id, deadline, status, deleted_at, updated_at",
      resources: "id, user_id, subject_id, lecture_id, task_id, deleted_at, updated_at",
      lecturers: "id, user_id, deleted_at, updated_at",
      timetableSlots: "id, user_id, subject_id, day_of_week, deleted_at, updated_at",
      pendingUploads: "id, resource_id, status",
      syncQueue: "id, table_name, record_id, status, client_updated_at",
      meta: "key",
    });
    // v4: timetable exceptions (cancel/move single occurrences).
    this.version(4).stores({
      semesters: "id, user_id, is_active, deleted_at, updated_at",
      subjects: "id, user_id, semester_id, lecturer_id, deleted_at, updated_at",
      lectures: "id, user_id, subject_id, lecture_date, deleted_at, updated_at",
      tasks: "id, user_id, subject_id, deadline, status, deleted_at, updated_at",
      resources: "id, user_id, subject_id, lecture_id, task_id, deleted_at, updated_at",
      lecturers: "id, user_id, deleted_at, updated_at",
      timetableSlots: "id, user_id, subject_id, day_of_week, deleted_at, updated_at",
      timetableExceptions: "id, user_id, timetable_slot_id, occurrence_date, deleted_at, updated_at",
      pendingUploads: "id, resource_id, status",
      syncQueue: "id, table_name, record_id, status, client_updated_at",
      meta: "key",
    });
    // v5: attendance records + exam schedule.
    this.version(5).stores({
      semesters: "id, user_id, is_active, deleted_at, updated_at",
      subjects: "id, user_id, semester_id, lecturer_id, deleted_at, updated_at",
      lectures: "id, user_id, subject_id, lecture_date, deleted_at, updated_at",
      tasks: "id, user_id, subject_id, deadline, status, deleted_at, updated_at",
      resources: "id, user_id, subject_id, lecture_id, task_id, deleted_at, updated_at",
      lecturers: "id, user_id, deleted_at, updated_at",
      timetableSlots: "id, user_id, subject_id, day_of_week, deleted_at, updated_at",
      timetableExceptions: "id, user_id, timetable_slot_id, occurrence_date, deleted_at, updated_at",
      attendanceRecords: "id, user_id, subject_id, attendance_date, deleted_at, updated_at",
      exams: "id, user_id, subject_id, exam_date, deleted_at, updated_at",
      pendingUploads: "id, resource_id, status",
      syncQueue: "id, table_name, record_id, status, client_updated_at",
      meta: "key",
    });
    // v6: grade book entries.
    this.version(6).stores({
      semesters: "id, user_id, is_active, deleted_at, updated_at",
      subjects: "id, user_id, semester_id, lecturer_id, deleted_at, updated_at",
      lectures: "id, user_id, subject_id, lecture_date, deleted_at, updated_at",
      tasks: "id, user_id, subject_id, deadline, status, deleted_at, updated_at",
      resources: "id, user_id, subject_id, lecture_id, task_id, deleted_at, updated_at",
      lecturers: "id, user_id, deleted_at, updated_at",
      timetableSlots: "id, user_id, subject_id, day_of_week, deleted_at, updated_at",
      timetableExceptions: "id, user_id, timetable_slot_id, occurrence_date, deleted_at, updated_at",
      attendanceRecords: "id, user_id, subject_id, attendance_date, deleted_at, updated_at",
      exams: "id, user_id, subject_id, exam_date, deleted_at, updated_at",
      gradeEntries: "id, user_id, subject_id, deleted_at, updated_at",
      pendingUploads: "id, resource_id, status",
      syncQueue: "id, table_name, record_id, status, client_updated_at",
      meta: "key",
    });
  }
}
export const db = new UniversityManagerDB();
