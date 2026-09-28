// Domain types shared by Dexie (local) and Supabase (remote). Every synced
// record follows the same shape so the sync engine (batch 10) can move data
// between the two without per-table translation logic.
//
// Design rules baked in here (see architecture notes):
//   - `id` is a client-generated UUID string (crypto.randomUUID()), never a
//     server-assigned identity, so offline creates already have a stable id.
//   - `user_id` scopes every record to its owner; enforced again server-side
//     by Supabase RLS.
//   - `deleted_at` implements soft deletes so deletions propagate through
//     sync instead of being hard-removed and potentially resurrected by a
//     stale pull on another device.
//   - `updated_at` is the last-write-wins timestamp used for conflict
//     resolution.

export type SyncStatus = "offline" | "online" | "syncing" | "synced" | "sync_failed";

export interface SyncMeta {
  id: string; // client-generated UUID
  user_id: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp — last-write-wins key
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

export interface Subject extends SyncMeta {
  semester_id: string;
  name: string;
  code: string | null;
  lecturer_name: string | null;
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
  title: string;
  url: string | null;
  storage_path: string | null;
  resource_type: ResourceType;
}

// One row per pending local change, drained by the sync engine (batch 10).
export interface SyncQueueEntry {
  id: string; // queue entry id, separate from the record's own id
  table_name: "semesters" | "subjects" | "lectures" | "tasks" | "resources";
  record_id: string;
  operation: "create" | "update" | "delete";
  payload: unknown;
  client_updated_at: string;
  attempts: number;
  status: "pending" | "syncing" | "failed";
  last_error: string | null;
  // Exponential-backoff gate: the sync engine (batch 10) skips this entry
  // until now() >= next_attempt_at, so a failing entry doesn't get
  // hammered every sync cycle.
  next_attempt_at: string | null;
}
