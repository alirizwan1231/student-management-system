import { listPendingUploads, removePendingUpload, markUploadFailed } from "@/lib/db/repo/pendingUploads";
import { attachStoragePath } from "@/lib/db/repo/resources";
import { uploadResourceFile } from "@/lib/storage/client";
export interface UploadDrainResult {
  uploaded: number;
  failed: number;
}
export async function drainPendingUploads(): Promise<UploadDrainResult> {
  const pending = await listPendingUploads();
  let uploaded = 0;
  let failed = 0;
  for (const item of pending) {
    if (item.status === "failed" && item.attempts >= 5) {
      continue;
    }
    try {
      const storagePath = await uploadResourceFile(item.resource_id, item.file_blob, item.file_name);
      await attachStoragePath(item.resource_id, storagePath);
      await removePendingUpload(item.id);
      uploaded += 1;
    } catch (err) {
      failed += 1;
      await markUploadFailed(item.id, err instanceof Error ? err.message : String(err));
    }
  }
  return { uploaded, failed };
}
