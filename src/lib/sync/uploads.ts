import {
  claimUpload,
  isDue,
  listPendingUploads,
  markUploadDone,
  markUploadFailed,
  purgeOldFinishedUploads,
  recordStoragePath,
  recoverStaleUploads,
  removePendingUpload,
} from "@/lib/db/repo/pendingUploads";
import { db } from "@/lib/db";
import { attachStoragePath } from "@/lib/db/repo/resources";
import { uploadResourceFile } from "@/lib/storage/client";
import { setUploadProgress } from "@/lib/sync/uploadProgress";
import { explainSyncError } from "@/lib/sync/explain";

export interface UploadDrainResult {
  uploaded: number;
  failed: number;
}

// Only one drain runs at a time, so two overlapping sync cycles can never upload a file twice.
let draining: Promise<UploadDrainResult> | null = null;

export function drainPendingUploads(): Promise<UploadDrainResult> {
  if (!draining) draining = doDrain().finally(() => void (draining = null));
  return draining;
}

async function doDrain(): Promise<UploadDrainResult> {
  await recoverStaleUploads();
  await purgeOldFinishedUploads();
  const due = (await listPendingUploads()).filter((u) => (u.status === "pending" || u.status === "failed") && isDue(u.next_attempt_at));
  let uploaded = 0;
  let failed = 0;

  for (const item of due) {
    const claimed = await claimUpload(item.id); // atomic: skips files another run already took
    if (!claimed) continue;
    try {
      const resource = await db.resources.get(item.resource_id);
      if (!resource || resource.deleted_at) {
        await removePendingUpload(item.id); // the attachment was deleted before it uploaded
        continue;
      }
      let path = claimed.storage_path ?? null;
      if (!path) {
        setUploadProgress(item.id, 0);
        path = await uploadResourceFile(item.resource_id, claimed.file_blob, claimed.file_name, (f) => setUploadProgress(item.id, f));
        await recordStoragePath(item.id, path); // from here a retry only re-attaches, it never re-uploads
      }
      if (resource.storage_path !== path) await attachStoragePath(item.resource_id, path);
      await markUploadDone(item.id, path);
      uploaded += 1;
    } catch (err) {
      failed += 1;
      await markUploadFailed(item.id, explainSyncError(err instanceof Error ? err.message : String(err)));
    } finally {
      setUploadProgress(item.id, null);
    }
  }
  return { uploaded, failed };
}
