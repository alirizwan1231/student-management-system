import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { getMeta, lastSyncedKey } from "@/lib/db/repo/meta";
import { DEXIE_TABLE, SYNCED_TABLES, lastErrorKey, type SyncedTable } from "@/lib/sync/pull";

export const TABLE_LABEL: Record<SyncedTable, string> = {
  semesters: "Semesters",
  subjects: "Subjects",
  lectures: "Notes",
  tasks: "Tasks",
  resources: "Files",
  lecturers: "Instructors",
  timetable_slots: "Timetable classes",
  timetable_exceptions: "Timetable changes",
  attendance_records: "Attendance",
  exams: "Exams",
  grade_entries: "Grades",
};

export interface TableDiagnostic {
  table: SyncedTable;
  label: string;
  local: number; // on this device
  cloud: number | null; // in the database (null = could not read)
  waiting: number; // changes on this device not uploaded yet
  pushError: string | null; // why uploading from this device is failing
  lastSyncedAt: string | null;
  error: string | null; // why downloading is failing
}

// Compares what this device has with what the cloud has, table by table.
export async function runDiagnostics(userId: string): Promise<TableDiagnostic[]> {
  const supabase = createClient();
  const out: TableDiagnostic[] = [];
  for (const table of SYNCED_TABLES) {
    const local = await db
      .table(DEXIE_TABLE[table])
      .where("user_id")
      .equals(userId)
      .filter((r: { deleted_at?: string | null }) => !r.deleted_at)
      .count();
    const queued = await db.syncQueue.where("table_name").equals(table).toArray();
    const pushError = queued.find((q) => q.last_error)?.last_error ?? null;
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId).is("deleted_at", null);
    const savedError = (await getMeta(lastErrorKey(table))) || null;
    out.push({
      table,
      label: TABLE_LABEL[table],
      local,
      cloud: error ? null : count ?? 0,
      waiting: queued.length,
      pushError,
      lastSyncedAt: (await getMeta(lastSyncedKey(table))) || null,
      error: error ? error.message : savedError,
    });
  }
  return out;
}

// Failed uploads wait longer and longer between retries. This makes them all due right now.
export async function retryFailedUploads() {
  await db.syncQueue.where("status").equals("failed").modify({ status: "pending", next_attempt_at: null });
}
