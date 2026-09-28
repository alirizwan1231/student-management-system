// Shared helper every repo (semesters, subjects, lectures, tasks,
// resources) calls after writing to its own Dexie table.

import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import type { SyncQueueEntry } from "@/types/academic";
import { requestSync } from "@/lib/sync/bus";

export async function enqueueChange(
  table_name: SyncQueueEntry["table_name"],
  record_id: string,
  operation: SyncQueueEntry["operation"],
  payload: unknown
) {
  const entry: SyncQueueEntry = {
    id: uuidv4(),
    table_name,
    record_id,
    operation,
    payload,
    client_updated_at: new Date().toISOString(),
    attempts: 0,
    status: "pending",
    last_error: null,
    next_attempt_at: null,
  };
  await db.syncQueue.add(entry);
  requestSync(); // ask the sync engine to run now instead of waiting for the interval
  return entry;
}
