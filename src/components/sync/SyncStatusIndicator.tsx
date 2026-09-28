"use client";

import { useSyncStatus } from "@/lib/sync/context";
import { cn } from "@/lib/utils/cn";

const LABEL: Record<string, string> = {
  offline: "Offline",
  online: "Online",
  syncing: "Syncing...",
  synced: "Synced",
  sync_failed: "Sync failed",
};

const DOT: Record<string, string> = {
  offline: "bg-sync-offline",
  online: "bg-sync-online",
  syncing: "bg-sync-syncing animate-pulse",
  synced: "bg-sync-synced",
  sync_failed: "bg-sync-failed",
};

// compact hides the text label (dot + tooltip only) -- used where space is
// tight, e.g. the mobile Topbar.
export function SyncStatusIndicator({ compact = false }: { compact?: boolean }) {
  const { status, triggerSync } = useSyncStatus();

  return (
    <button
      onClick={triggerSync}
      title="Tap to sync now"
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        compact ? "p-1.5" : "px-3 py-1"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", DOT[status])} />
      {!compact && LABEL[status]}
    </button>
  );
}
