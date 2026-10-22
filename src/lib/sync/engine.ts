import type { SyncStatus } from "@/types/academic";
import { browserReportsOnline } from "@/lib/sync/connectivity";
import { getAppMode } from "@/lib/sync/mode";
import { pushPendingChanges } from "@/lib/sync/push";
import { pullRemoteChanges } from "@/lib/sync/pull";
import { drainPendingUploads } from "@/lib/sync/uploads";
import { setMeta } from "@/lib/db/repo/meta";
import { explainSyncError } from "@/lib/sync/explain";

export const CYCLE_ERROR_KEY = "sync_cycle_error";

export interface SyncCycleResult {
  status: SyncStatus;
  pushed: number;
  pulled: number;
  uploaded: number;
  failed: number;
}

// Only one cycle runs at a time; a second request just waits for (and shares) the running one,
// so nothing is pushed or uploaded twice.
let inFlight: Promise<SyncCycleResult> | null = null;

export function runSyncCycle(userId: string): Promise<SyncCycleResult> {
  if (!inFlight) inFlight = doCycle(userId).finally(() => void (inFlight = null));
  return inFlight;
}

// push edits -> pull remote changes -> upload files. The three steps are INDEPENDENT: a failure in
// one (e.g. a login problem while pushing) no longer stops the others, which is what used to leave
// files stuck on "Waiting for upload".
async function doCycle(userId: string): Promise<SyncCycleResult> {
  if (getAppMode() === "offline" || !browserReportsOnline()) {
    return { status: "offline", pushed: 0, pulled: 0, uploaded: 0, failed: 0 };
  }

  let pushed = 0;
  let pulled = 0;
  let uploaded = 0;
  let failed = 0;
  let firstError: string | null = null;
  const note = (err: unknown) => {
    failed += 1;
    const raw = err instanceof Error ? err.message : (err as { message?: string })?.message ?? "Sync failed";
    console.error("Sync step failed:", err);
    firstError ??= explainSyncError(raw);
  };

  try {
    const r = await pushPendingChanges();
    pushed = r.pushed;
    failed += r.failed;
  } catch (err) {
    note(err);
  }
  try {
    const r = await pullRemoteChanges(userId);
    pulled = r.pulled;
    failed += r.failedTables.length;
  } catch (err) {
    note(err);
  }
  try {
    const r = await drainPendingUploads();
    uploaded = r.uploaded;
    failed += r.failed;
  } catch (err) {
    note(err);
  }

  await setMeta(CYCLE_ERROR_KEY, firstError ?? "").catch(() => undefined);
  if (failed === 0) await setMeta("last_full_sync_at", new Date().toISOString()).catch(() => undefined);
  return { status: failed > 0 ? "sync_failed" : "synced", pushed, pulled, uploaded, failed };
}
