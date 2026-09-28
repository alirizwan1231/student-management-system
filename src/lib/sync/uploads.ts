import { listPendingUploads, removePendingUpload, markUploadFailed } from "@/lib/db/repo/pendingUploads";
import { attachStoragePath } from "@/lib/db/repo/resources";
import { uploadResourceFile } from "@/lib/supabase/storage";
import { buildStoragePath } from "@/lib/db/repo/pendingUploads";

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
      // Give up quietly after 5 attempts; the resource stays visible in the
      // UI marked "pending upload" and the user can be told to retry
      // manually in a future batch's UI polish pass.
      continue;
    }
    try {
      const path = buildStoragePath(item.user_id, item.resource_id, item.file_name);
      await uploadResourceFile(path, item.file_blob);
      await attachStoragePath(item.resource_id, path);
      await removePendingUpload(item.id);
      uploaded += 1;
    } catch (err) {
      failed += 1;
      await markUploadFailed(item.id, err instanceof Error ? err.message : String(err));
    }
  }

  return { uploaded, failed };
}
