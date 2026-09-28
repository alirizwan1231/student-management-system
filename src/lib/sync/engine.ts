import type { SyncStatus } from "@/types/academic";
import { checkReachability } from "@/lib/sync/connectivity";
import { pushPendingChanges } from "@/lib/sync/push";
import { pullRemoteChanges } from "@/lib/sync/pull";
import { drainPendingUploads } from "@/lib/sync/uploads";
import { setMeta } from "@/lib/db/repo/meta";

export interface SyncCycleResult {
  status: SyncStatus;
  pushed: number;
  pulled: number;
  uploaded: number;
  failed: number;
}

// One full sync cycle: push local changes first (so this device's edits
// win any near-simultaneous conflict against a stale pull), then pull
// remote changes, then drain the file-upload queue. Order matters -- see
// the note in pull.ts about why push must run first.
export async function runSyncCycle(userId: string): Promise<SyncCycleResult> {
  const reachable = await checkReachability();
  if (!reachable) {
    return { status: "offline", pushed: 0, pulled: 0, uploaded: 0, failed: 0 };
  }

  try {
    const pushResult = await pushPendingChanges();
    const pullResult = await pullRemoteChanges(userId);
    const uploadResult = await drainPendingUploads();

    const anyFailed = pushResult.failed > 0 || uploadResult.failed > 0;
    const status: SyncStatus = anyFailed ? "sync_failed" : "synced";

    await setMeta("last_full_sync_at", new Date().toISOString());

    return {
      status,
      pushed: pushResult.pushed,
      pulled: pullResult.pulled,
      uploaded: uploadResult.uploaded,
      failed: pushResult.failed + uploadResult.failed,
    };
  } catch {
    return { status: "sync_failed", pushed: 0, pulled: 0, uploaded: 0, failed: 1 };
  }
}
