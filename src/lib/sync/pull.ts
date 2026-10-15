import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { getMeta, setMeta, lastSyncedKey } from "@/lib/db/repo/meta";

// Supabase table -> Dexie table name.
const DEXIE_TABLE = {
  semesters: "semesters",
  subjects: "subjects",
  lectures: "lectures",
  tasks: "tasks",
  resources: "resources",
  lecturers: "lecturers",
  timetable_slots: "timetableSlots",
  timetable_exceptions: "timetableExceptions",
  attendance_records: "attendanceRecords",
  exams: "exams",
  grade_entries: "gradeEntries",
} as const;
type SyncedTable = keyof typeof DEXIE_TABLE;
const SYNCED_TABLES = Object.keys(DEXIE_TABLE) as SyncedTable[];

// Tables added by later migrations. If the user's database has not run those
// migrations yet, skip them instead of failing the whole sync.
const OPTIONAL_TABLES = new Set<SyncedTable>(["timetable_slots", "timetable_exceptions", "attendance_records", "exams", "grade_entries", "lecturers"]);

function isMissingTable(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache|could not find the table/i.test(error.message ?? "");
}

export interface PullResult {
  pulled: number;
}

// Pulls rows changed since the last successful pull for each table and
// upserts them into the matching Dexie table. Last-write-wins: we simply
// overwrite the local row, which is correct as long as pushPendingChanges()
// always runs first in the same cycle (see engine.ts) -- so any of *this*
// device's own unsynced edits already reached the server, or are still
// safely queued and not yet due for retry.
export async function pullRemoteChanges(userId: string): Promise<PullResult> {
  const supabase = createClient();
  let pulled = 0;

  for (const tableName of SYNCED_TABLES) {
    const since = (await getMeta(lastSyncedKey(tableName))) ?? "1970-01-01T00:00:00.000Z";

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("user_id", userId)
      .gt("updated_at", since)
      .order("updated_at", { ascending: true });

    if (error) {
      if (OPTIONAL_TABLES.has(tableName) && isMissingTable(error)) continue;
      throw error;
    }
    if (!data || data.length === 0) continue;

    const dexieTable = db.table(DEXIE_TABLE[tableName]) as unknown as { bulkPut: (rows: unknown[]) => Promise<unknown> };
    await dexieTable.bulkPut(data);
    pulled += data.length;

    const latest = data[data.length - 1] as { updated_at: string };
    await setMeta(lastSyncedKey(tableName), latest.updated_at);
  }

  return { pulled };
}
