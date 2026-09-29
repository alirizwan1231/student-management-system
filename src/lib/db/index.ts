// Dexie (IndexedDB) database -- the UI's local source of truth.
//
// Table key syntax reminder: the first field listed is the primary key.
// Fields after it are indexed for .where()/.orderBy() queries.

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

// A file queued for upload while offline. The actual File/Blob is stored
// directly in IndexedDB (Dexie supports Blob values) until the sync engine
// uploads it to Supabase Storage and records the resulting storage_path.
export interface PendingUpload {
  id: string; // queue entry id
  resource_id: string; // the Resource row this upload belongs to
  user_id: string;
  file_name: string;
  file_blob: Blob;
  status: "pending" | "uploading" | "failed";
  attempts: number;
  last_error: string | null;
  created_at: string;
}

// Small key/value store for sync bookkeeping, e.g. per-table
// last_synced_at timestamps and the current SyncStatus.
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

    // v2: instructors as a real entity, plus the indexes needed to query
    // subjects by instructor and resources by task (both power the new
    // cross-linked Instructor / Task detail pages). Purely additive --
    // existing rows keep working, new fields are just undefined until set.
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
  }
}

export const db = new UniversityManagerDB();
