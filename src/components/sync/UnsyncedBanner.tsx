"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { useSyncStatus } from "@/lib/sync/context";
import { retryFailedUploads } from "@/lib/sync/diagnostics";
import { explainSyncError } from "@/lib/sync/explain";
import { CYCLE_ERROR_KEY } from "@/lib/sync/engine";

// Never fail silently: when something you saved on this device cannot be uploaded to the
// cloud, say so, say why, and offer a retry.
export function UnsyncedBanner() {
  const { triggerSync } = useSyncStatus();
  const info = useLiveQuery(async () => {
    const queue = await db.syncQueue.toArray();
    const failed = queue.filter((q) => q.status === "failed");
    const cycle = (await db.meta.get(CYCLE_ERROR_KEY))?.value || "";
    return { waiting: queue.length, failed: failed.length, reason: cycle || failed.find((q) => q.last_error)?.last_error || "" };
  }, []);

  if (!info || (info.failed === 0 && !info.reason)) return null;
  // Only alarm when something is actually stuck (a queued item that is merely waiting for its first attempt is normal).
  const count = Math.max(info.failed, 0);

  return (
    <div className="fixed inset-x-3 top-16 z-40 mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-3.5 shadow-lg dark:border-amber-500/25 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
            {count > 0 ? `${count} change${count === 1 ? "" : "s"} not saved to the cloud yet` : "Sync problem"}
          </p>
          <p className="mt-0.5 break-words text-xs leading-5 text-amber-800/90 dark:text-amber-200/80">{explainSyncError(info.reason)}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await retryFailedUploads();
                triggerSync();
              }}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Retry now
            </button>
            <Link href="/settings" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-white/[0.06]">
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}