import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { computeNextAttemptAt, isDue } from "@/lib/sync/backoff";
import type { SyncQueueEntry } from "@/types/academic";
import { deleteResourceFile } from "@/lib/storage/client";

export interface PushResult {
  pushed: number;
  failed: number;
}

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

  for (const entry of entries) {
    if (entry.status === "failed" && !isDue(entry.next_attempt_at)) {
      continue; // still within backoff window
    }

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
        last_error: err instanceof Error ? err.message : String(err),
        next_attempt_at: computeNextAttemptAt(attempts),
      });
    }
  }

  return { pushed, failed };
}

async function pushOne(supabase: ReturnType<typeof createClient>, entry: SyncQueueEntry) {
  const table = supabase.from(entry.table_name);

  if (entry.operation === "delete") {
    const payload = entry.payload as { deleted_at: string; updated_at: string };
    const { error } = await table
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

  // create + update both become an upsert -- simplest way to make retries
  // idempotent (a create retried after a flaky response just upserts again).
  const { error } = await table.upsert(entry.payload as Record<string, unknown>, { onConflict: "id" });
  if (error) throw error;
}
