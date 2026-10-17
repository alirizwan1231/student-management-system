import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { getMeta, setMeta, lastSyncedKey } from "@/lib/db/repo/meta";

// Supabase table -> Dexie table name.
export const DEXIE_TABLE = {
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
export type SyncedTable = keyof typeof DEXIE_TABLE;
export const SYNCED_TABLES = Object.keys(DEXIE_TABLE) as SyncedTable[];

// Tables added by later migrations. If the user's database has not run those
// migrations yet, skip them instead of failing the whole sync.
const OPTIONAL_TABLES = new Set<SyncedTable>(["timetable_slots", "timetable_exceptions", "attendance_records", "exams", "grade_entries", "lecturers"]);

export const lastErrorKey = (table: string) => `sync_error:${table}`;

const PAGE_SIZE = 1000;
// Re-read the last couple of minutes on every pull. This protects against rows that share a
// timestamp, tiny clock differences and slow writes, and costs almost nothing.
const OVERLAP_MS = 2 * 60 * 1000;

function isMissingTable(error: unknown) {
  const e = error as { code?: string; message?: string };
  return e?.code === "42P01" || e?.code === "PGRST205" || /does not exist|schema cache|could not find the table/i.test(e?.message ?? "");
}

export interface PullResult {
  pulled: number;
  failedTables: string[];
}

type DexieLike = {
  bulkGet: (ids: string[]) => Promise<({ updated_at?: string } | undefined)[]>;
  bulkPut: (rows: unknown[]) => Promise<unknown>;
};

// Pulls rows changed since the last successful pull for each table and upserts
// them into the matching Dexie table. Each table is pulled on its own: if one
// table fails (missing migration, permissions, network blip) the others still
// sync, and the failure is remembered so Settings -> Sync check can show it.
// A local row that is NEWER than the cloud copy is kept (it will be pushed).
export async function pullRemoteChanges(userId: string): Promise<PullResult> {
  const supabase = createClient();
  let pulled = 0;
  const failedTables: string[] = [];

  for (const tableName of SYNCED_TABLES) {
    try {
      const stored = await getMeta(lastSyncedKey(tableName));
      let cursor = stored ? new Date(new Date(stored).getTime() - OVERLAP_MS).toISOString() : "1970-01-01T00:00:00.000Z";
      const local = db.table(DEXIE_TABLE[tableName]) as unknown as DexieLike;
      let newest: string | null = null;

      for (;;) {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .eq("user_id", userId)
          .gt("updated_at", cursor)
          .order("updated_at", { ascending: true })
          .limit(PAGE_SIZE);
        if (error) throw error;
        if (!data || data.length === 0) break;

        const rows = data as { id: string; updated_at: string }[];
        const existing = await local.bulkGet(rows.map((r) => r.id));
        const fresh = rows.filter((r, i) => {
          const mine = existing[i];
          return !mine || !mine.updated_at || new Date(mine.updated_at).getTime() <= new Date(r.updated_at).getTime();
        });
        if (fresh.length > 0) await local.bulkPut(fresh);
        pulled += fresh.length;

        const last = rows[rows.length - 1].updated_at;
        newest = last;
        if (rows.length < PAGE_SIZE || last === cursor) break;
        cursor = last;
      }

      if (newest) {
        // never let one future-dated row (wrong device clock) push the watermark past "now"
        const safe = Math.min(new Date(newest).getTime(), Date.now());
        await setMeta(lastSyncedKey(tableName), new Date(safe).toISOString());
      }
      await setMeta(lastErrorKey(tableName), "");
    } catch (error) {
      if (OPTIONAL_TABLES.has(tableName) && isMissingTable(error)) continue;
      const message = error instanceof Error ? error.message : (error as { message?: string })?.message ?? "Unknown error";
      console.error(`Sync pull failed for "${tableName}":`, error);
      await setMeta(lastErrorKey(tableName), message).catch(() => undefined);
      failedTables.push(tableName);
    }
  }

  return { pulled, failedTables };
}

// Forget "how far we synced" so the next pull downloads everything again.
// Local unsynced edits are untouched (they stay queued and are pushed first).
export async function resetSyncWatermarks() {
  for (const table of SYNCED_TABLES) await setMeta(lastSyncedKey(table), "");
}