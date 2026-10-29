import { validateUpload } from "@/lib/r2/validation";
import { db, type PendingUpload } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { requestSync } from "@/lib/sync/bus";

export function buildStoragePath(userId: string, resourceId: string, fileName: string) {
  return `users/${userId}/${resourceId}/${fileName}`;
}

const STALE_UPLOAD_MS = 3 * 60 * 1000; // an "uploading" entry older than this belonged to a closed tab
const KEEP_DONE_MS = 7 * 24 * 60 * 60 * 1000;

export async function queueFileUpload(userId: string, resourceId: string, file: File) {
  const invalid = validateUpload(file.name, file.size);
  if (invalid) throw new Error(invalid);
  const entry: PendingUpload = {
    id: newId(),
    resource_id: resourceId,
    user_id: userId,
    file_name: file.name,
    file_blob: file,
    file_size: file.size,
    file_type: file.type || "",
    status: "pending",
    attempts: 0,
    last_error: null,
    next_attempt_at: null,
    created_at: nowIso(),
  };
  await db.pendingUploads.add(entry);
  requestSync();
  return entry;
}

export function listPendingUploads() {
  return db.pendingUploads.toArray();
}

export function listPendingUploadsForResource(resourceId: string) {
  return db.pendingUploads.where({ resource_id: resourceId }).toArray();
}

export function isDue(next: string | null | undefined) {
  return !next || new Date(next).getTime() <= Date.now();
}

// Two sync cycles (or two tabs) must never upload the same file at once.
export async function claimUpload(id: string): Promise<PendingUpload | null> {
  return db.transaction("rw", db.pendingUploads, async () => {
    const entry = await db.pendingUploads.get(id);
    if (!entry || entry.status === "done") return null;
    if (entry.status === "uploading" && entry.started_at && Date.now() - new Date(entry.started_at).getTime() < STALE_UPLOAD_MS) return null;
    await db.pendingUploads.update(id, { status: "uploading", started_at: nowIso() });
    return { ...entry, status: "uploading" as const };
  });
}

export async function recordStoragePath(id: string, storagePath: string) {
  await db.pendingUploads.update(id, { storage_path: storagePath });
}

export async function markUploadDone(id: string, storagePath: string) {
  // the file is in the cloud now: free the space the local copy used
  await db.pendingUploads.update(id, { status: "done", storage_path: storagePath, completed_at: nowIso(), last_error: null, next_attempt_at: null, file_blob: new Blob([]) });
}

export async function markUploadFailed(id: string, error: string) {
  const entry = await db.pendingUploads.get(id);
  const attempts = (entry?.attempts ?? 0) + 1;
  const waitMs = Math.min(15 * 60_000, 30_000 * 2 ** Math.min(attempts - 1, 5)); // 30s, 1m, 2m ... 15m
  await db.pendingUploads.update(id, { status: "failed", attempts, last_error: error, next_attempt_at: new Date(Date.now() + waitMs).toISOString() });
}

export async function retryUpload(id: string) {
  await db.pendingUploads.update(id, { status: "pending", next_attempt_at: null });
  requestSync();
}

export async function retryAllFailedUploads() {
  await db.pendingUploads.where("status").equals("failed").modify({ status: "pending", next_attempt_at: null });
  requestSync();
}

export async function recoverStaleUploads() {
  const all = await db.pendingUploads.where("status").equals("uploading").toArray();
  for (const u of all) {
    if (!u.started_at || Date.now() - new Date(u.started_at).getTime() >= STALE_UPLOAD_MS) await db.pendingUploads.update(u.id, { status: "pending" });
  }
}

export async function purgeOldFinishedUploads() {
  const all = await db.pendingUploads.where("status").equals("done").toArray();
  const old = all.filter((u) => u.completed_at && Date.now() - new Date(u.completed_at).getTime() > KEEP_DONE_MS).map((u) => u.id);
  if (old.length) await db.pendingUploads.bulkDelete(old);
}

export async function clearFinishedUploads() {
  await db.pendingUploads.where("status").equals("done").delete();
}

export async function removePendingUpload(id: string) {
  await db.pendingUploads.delete(id);
}
