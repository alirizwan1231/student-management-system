// Domain types shared by Dexie (local) and Supabase (remote). Every synced
// record follows the same shape so the sync engine can move data between
// the two without per-table translation logic.

export type SyncStatus = "offline" | "online" | "syncing" | "synced" | "sync_failed";

export interface SyncMeta {
  id: string; // client-generated UUID
  user_id: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp -- last-write-wins key
  deleted_at: string | null; // soft delete
}

export interface Semester extends SyncMeta {
  name: string;
  number: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  archived_at: string | null;
}

// A real instructor entity: subjects/tasks can link to one instead of only
// carrying their name as text.
export interface Lecturer extends SyncMeta {
  name: string;
  email: string | null;
}

export interface Subject extends SyncMeta {
  semester_id: string;
  name: string;
  code: string | null;
  // lecturer_name is kept for display/back-compat with subjects created
  // before instructors existed as their own entity; lecturer_id is the
  // real relation, set whenever a subject is created/edited via the form.
  lecturer_name: string | null;
  lecturer_id: string | null;
  description: string | null;
  credit_hours: number | null;
  color: string | null;
}

export interface Lecture extends SyncMeta {
  subject_id: string;
  lecture_number: number | null;
  title: string;
  lecture_date: string | null;
  detailed_notes: string | null;
  short_summary: string | null;
  keywords: string[];
}

export type TaskType = "assignment" | "lab" | "quiz" | "presentation" | "project" | "other";
export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";
export type TaskPriority = "low" | "medium" | "high";

export interface AcademicTask extends SyncMeta {
  subject_id: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  deadline: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  marks: number | null;
  storage_path: string | null;
}

export type ResourceType = "pdf" | "ppt" | "doc" | "image" | "link" | "other";

export interface Resource extends SyncMeta {
  subject_id: string | null;
  lecture_id: string | null;
  // A resource can also be attached directly to a task (e.g. instructions,
  // a submission template) -- so task detail pages get real attachments
  // too, reusing this same table/upload pipeline.
  task_id: string | null;
  title: string;
  url: string | null;
  storage_path: string | null;
  resource_type: ResourceType;
}

// One row per pending local change, drained by the sync engine.
export interface SyncQueueEntry {
  id: string; // queue entry id, separate from the record's own id
  table_name: "semesters" | "subjects" | "lectures" | "tasks" | "resources" | "lecturers";
  record_id: string;
  operation: "create" | "update" | "delete";
  payload: unknown;
  client_updated_at: string;
  attempts: number;
  status: "pending" | "syncing" | "failed";
  last_error: string | null;
  // Exponential-backoff gate: the sync engine skips this entry until
  // now() >= next_attempt_at, so a failing entry doesn't get hammered.
  next_attempt_at: string | null;
}
