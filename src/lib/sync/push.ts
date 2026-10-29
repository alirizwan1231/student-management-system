import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { computeNextAttemptAt, isDue } from "@/lib/sync/backoff";
import { normalizePayload } from "@/lib/sync/normalize";
import type { SyncQueueEntry } from "@/types/academic";
import { deleteResourceFile } from "@/lib/storage/client";

export interface PushResult {
  pushed: number;
  failed: number;
}

type Supa = ReturnType<typeof createClient>;

// Which parent row each foreign key points to. If a child upload fails because its parent
// (e.g. the subject of a task) is not in the cloud yet, we upload that parent first.
const PARENTS: Record<string, { field: string; table: string; dexie: string }[]> = {
  subjects: [
    { field: "semester_id", table: "semesters", dexie: "semesters" },
    { field: "lecturer_id", table: "lecturers", dexie: "lecturers" },
  ],
  lectures: [{ field: "subject_id", table: "subjects", dexie: "subjects" }],
  tasks: [{ field: "subject_id", table: "subjects", dexie: "subjects" }],
  resources: [
    { field: "subject_id", table: "subjects", dexie: "subjects" },
    { field: "task_id", table: "tasks", dexie: "tasks" },
    { field: "lecture_id", table: "lectures", dexie: "lectures" },
  ],
  timetable_slots: [{ field: "subject_id", table: "subjects", dexie: "subjects" }],
  timetable_exceptions: [{ field: "timetable_slot_id", table: "timetable_slots", dexie: "timetableSlots" }],
  attendance_records: [{ field: "subject_id", table: "subjects", dexie: "subjects" }],
  exams: [{ field: "subject_id", table: "subjects", dexie: "subjects" }],
  grade_entries: [{ field: "subject_id", table: "subjects", dexie: "subjects" }],
};

// Pushes every due, pending syncQueue entry to Supabase, in order, so a
// create always reaches the server before a later update/delete for the
// same record. Each table gets a plain upsert (create/update) or a soft
// -delete update -- RLS on the server scopes everything to the caller's
// own rows regardless, so no explicit user_id filtering is needed here.
export async function pushPendingChanges(): Promise<PushResult> {
  const supabase = createClient();
  const entries = await db.syncQueue.orderBy("client_updated_at").toArray();
  let pushed = 0;
  let failed = 0;
  if (entries.length === 0) return { pushed, failed };

  // Without a real login session every request is anonymous and the database rejects it.
  // Say so clearly instead of failing every row with a confusing message.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in (session expired). Please sign in again.");

  for (const entry of entries) {
    if (entry.status === "failed" && !isDue(entry.next_attempt_at)) {
      continue; // still within backoff window
    }
    // Changes made while another account was signed in on this browser stay queued untouched;
    // they are not errors and must not be uploaded under the wrong account.
    const owner = (entry.payload as { user_id?: string } | null)?.user_id;
    if (owner && owner !== session.user.id) continue;

    try {
      await pushOne(supabase, entry);
      await db.syncQueue.delete(entry.id);
      pushed += 1;
    } catch (err) {
      failed += 1;
      const attempts = entry.attempts + 1;
      await db.syncQueue.update(entry.id, {
        status: "failed",
        attempts,
        last_error: errorText(err),
        next_attempt_at: computeNextAttemptAt(attempts),
      });
    }
  }

  return { pushed, failed };
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  const e = err as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [e?.message, e?.details, e?.hint].filter(Boolean);
  return (parts.length ? parts.join(" - ") : String(err)) + (e?.code ? ` (${e.code})` : "");
}

async function upsertRow(supabase: Supa, table: string, payload: Record<string, unknown>) {
  const { error } = await supabase.from(table).upsert(normalizePayload(payload), { onConflict: "id" });
  if (error) throw error;
}

// Uploads missing parent rows (only if the cloud does not have them yet, so a newer cloud copy is never overwritten).
async function ensureParents(supabase: Supa, table: string, payload: Record<string, unknown>, depth = 0): Promise<boolean> {
  if (depth > 2) return false;
  let uploaded = false;
  for (const parent of PARENTS[table] ?? []) {
    const parentId = payload[parent.field];
    if (typeof parentId !== "string" || !parentId) continue;
    const { count } = await supabase.from(parent.table).select("id", { count: "exact", head: true }).eq("id", parentId);
    if ((count ?? 0) > 0) continue;
    const local = (await db.table(parent.dexie).get(parentId)) as Record<string, unknown> | undefined;
    if (!local) continue;
    await ensureParents(supabase, parent.table, local, depth + 1);
    await upsertRow(supabase, parent.table, local);
    uploaded = true;
  }
  return uploaded;
}

async function pushOne(supabase: Supa, entry: SyncQueueEntry) {
  if (entry.operation === "delete") {
    const payload = entry.payload as { deleted_at: string; updated_at: string };
    const { error } = await supabase
      .from(entry.table_name)
      .update({ deleted_at: payload.deleted_at, updated_at: payload.updated_at })
      .eq("id", entry.record_id);
    if (error) throw error;
    // Best-effort R2 cleanup: the Supabase row is the source of truth for
    // "is this resource deleted"; a failed object delete is logged and
    // swallowed rather than blocking/retrying the whole sync entry.
    if (entry.table_name === "resources") {
      const storagePath = (entry.payload as { storage_path?: string | null }).storage_path;
      if (storagePath) {
        try {
          await deleteResourceFile(storagePath);
        } catch (err) {
          console.warn("R2 cleanup failed for deleted resource (not blocking sync):", err);
        }
      }
    }
    return;
  }

  const payload = entry.payload as Record<string, unknown>;

  // create + update both become an upsert -- simplest way to make retries
  // idempotent (a create retried after a flaky response just upserts again).
  try {
    await upsertRow(supabase, entry.table_name, payload);
  } catch (err) {
    if ((err as { code?: string })?.code === "23503" && (await ensureParents(supabase, entry.table_name, payload))) {
      await upsertRow(supabase, entry.table_name, payload); // parent is in the cloud now: retry once
      return;
    }
    throw err;
  }
}
