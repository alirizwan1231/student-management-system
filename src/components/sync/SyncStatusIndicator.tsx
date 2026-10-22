"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { formatDistanceToNow } from "date-fns";
import { CloudOff, Wifi, WifiOff } from "lucide-react";
import { db } from "@/lib/db";
import { useSyncStatus } from "@/lib/sync/context";
import { useToast } from "@/components/ui/Toast";
import { retryFailedUploads } from "@/lib/sync/diagnostics";
import { retryAllFailedUploads } from "@/lib/db/repo/pendingUploads";
import type { AppMode } from "@/lib/sync/mode";
import { cn } from "@/lib/utils/cn";

// The always-visible status pill. It shows two different things on purpose:
//   MODE    = what you chose (Online / Offline)       -> you can switch it any time
//   NETWORK = whether the internet really works       -> detected automatically
function describe(mode: AppMode, networkOnline: boolean, status: string) {
  if (mode === "offline")
    return {
      label: "Offline mode",
      short: "Offline",
      dot: "bg-amber-500",
      hint: networkOnline ? "Internet is available. Switch to Online to sync your changes." : "No internet. Changes are saved on this device.",
    };
  if (!networkOnline) return { label: "Offline", short: "Offline", dot: "bg-slate-400", hint: "No connection. Changes are saved on this device and sync automatically when it returns." };
  if (status === "syncing") return { label: "Syncing...", short: "Syncing", dot: "bg-sky-500 animate-pulse", hint: "Sending and receiving your changes." };
  if (status === "sync_failed") return { label: "Sync failed", short: "Failed", dot: "bg-rose-500", hint: "Some changes could not be synced. Tap Retry." };
  return { label: "Online", short: "Online", dot: "bg-emerald-500", hint: "Everything is up to date." };
}

export function SyncStatusIndicator({ compact = false }: { compact?: boolean }) {
  const { status, mode, setMode, networkOnline, lastSyncedAt, triggerSync } = useSyncStatus();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef(false);
  const prevStatus = useRef(status);

  const counts = useLiveQuery(
    async () => ({
      changes: await db.syncQueue.count(),
      failedChanges: await db.syncQueue.where("status").equals("failed").count(),
      files: await db.pendingUploads.where("status").anyOf(["pending", "uploading"]).count(),
      failedFiles: await db.pendingUploads.where("status").equals("failed").count(),
    }),
    [],
    { changes: 0, failedChanges: 0, files: 0, failedFiles: 0 }
  );

  // Tell the user how a sync they started ended.
  useEffect(() => {
    if (manualRef.current && prevStatus.current === "syncing") {
      if (status === "synced") {
        showToast("All changes are synced.");
        manualRef.current = false;
      } else if (status === "sync_failed") {
        showToast("Some changes could not be synced. See details in the status menu.", "error");
        manualRef.current = false;
      }
    }
    prevStatus.current = status;
  }, [status, showToast]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => boxRef.current && !boxRef.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const d = describe(mode, networkOnline, status);
  const waiting = counts.changes + counts.files;
  const failed = counts.failedChanges + counts.failedFiles;

  const chooseMode = (next: AppMode) => {
    if (next === mode) return;
    setMode(next);
    if (next === "online") {
      manualRef.current = true;
      showToast(networkOnline ? "Switched to Online mode. Syncing your changes..." : "Online mode is on. Changes will sync as soon as the internet is back.");
    } else {
      showToast("Switched to Offline mode. Everything is saved on this device and will sync when you go Online.");
    }
  };

  const syncNow = () => {
    manualRef.current = true;
    triggerSync();
  };

  const retryFailed = async () => {
    manualRef.current = true;
    await retryFailedUploads();
    await retryAllFailedUploads();
    triggerSync();
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={d.hint}
        className={cn(
          "flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50",
          "dark:border-white/[0.1] dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/[0.06]",
          compact ? "px-2.5" : "w-full justify-between"
        )}
      >
        <span className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", d.dot)} />
          {compact ? d.short : d.label}
        </span>
        {!compact && waiting > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">{waiting}</span>}
      </button>

      {open && (
        <div
          role="dialog"
          className={cn(
            "absolute z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-white/[0.1] dark:bg-slate-900",
            compact ? "right-0 top-full mt-2" : "bottom-full left-0 mb-2"
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", d.dot)} />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{d.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{d.hint}</p>
            </div>
          </div>

          <p className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Working mode</p>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.06]">
            {([["online", "Online", Wifi], ["offline", "Offline", CloudOff]] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => chooseMode(id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition",
                  mode === id ? "bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          <dl className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Internet</dt>
              <dd className={cn("inline-flex items-center gap-1 font-semibold", networkOnline ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {networkOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                {networkOnline ? "Available" : "Not available"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Waiting to sync</dt>
              <dd className="font-semibold text-slate-700 dark:text-slate-200">
                {counts.changes} changes, {counts.files} files
              </dd>
            </div>
            {failed > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Failed</dt>
                <dd className="font-semibold text-rose-600 dark:text-rose-400">{failed}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Last synced</dt>
              <dd className="font-semibold text-slate-700 dark:text-slate-200">{lastSyncedAt ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true }) : "Not yet"}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-col gap-2">
            {mode === "offline" ? (
              <button type="button" onClick={() => chooseMode("online")} disabled={!networkOnline} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500">
                {networkOnline ? "Go Online and sync now" : "Go Online (waiting for internet)"}
              </button>
            ) : (
              <button type="button" onClick={syncNow} disabled={!networkOnline || status === "syncing"} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500">
                {status === "syncing" ? "Syncing..." : "Sync now"}
              </button>
            )}
            {failed > 0 && mode === "online" && (
              <button type="button" onClick={retryFailed} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
                Retry failed items
              </button>
            )}
            <Link href="/uploads" onClick={() => setOpen(false)} className="text-center text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Open Uploads manager
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
