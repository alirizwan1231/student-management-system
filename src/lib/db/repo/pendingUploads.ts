import { validateUpload } from "@/lib/r2/validation";
import { db, type PendingUpload } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { requestSync } from "@/lib/sync/bus";

export function buildStoragePath(userId: string, resourceId: string, fileName: string) {
  return `users/${userId}/${resourceId}/${fileName}`;
}

export async function queueFileUpload(userId: string, resourceId: string, file: File) {
  const invalid = validateUpload(file.name, file.size);
  if (invalid) throw new Error(invalid);
  const entry: PendingUpload = {
    id: newId(),
    resource_id: resourceId,
    user_id: userId,
    file_name: file.name,
    file_blob: file,
    status: "pending",
    attempts: 0,
    last_error: null,
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

export async function markUploadFailed(id: string, error: string) {
  const entry = await db.pendingUploads.get(id);
  await db.pendingUploads.update(id, {
    status: "failed",
    attempts: (entry?.attempts ?? 0) + 1,
    last_error: error,
  });
}

export async function removePendingUpload(id: string) {
  await db.pendingUploads.delete(id);
}
