"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, FileText, Loader2, RotateCw, Trash2, UploadCloud } from "lucide-react";
import { db, type PendingUpload } from "@/lib/db";
import { useUser } from "@/hooks/useUser";
import { useSyncStatus } from "@/lib/sync/context";
import { useUploadProgress } from "@/lib/sync/uploadProgress";
import { clearFinishedUploads, removePendingUpload, retryAllFailedUploads, retryUpload } from "@/lib/db/repo/pendingUploads";
import { openFileViewer } from "@/lib/files/viewerBus";
import { getResourceFileUrl } from "@/lib/storage/client";
import { cn } from "@/lib/utils/cn";

function size(bytes?: number) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Row({ u, title, progress, waitingReason }: { u: PendingUpload; title?: string; progress?: number; waitingReason: string }) {
  const pct = Math.round((progress ?? 0) * 100);
  return (
    <li className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
          <FileText size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{u.file_name}</p>
          <p className="truncate text-xs text-slate-400 dark:text-slate-500">
            {[title && `For: ${title}`, size(u.file_size)].filter(Boolean).join(" • ")}
          </p>

          {u.status === "uploading" && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" />Uploading</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
                <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          {u.status === "pending" && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400"><Clock size={11} />Queued: {waitingReason}</p>
          )}
          {u.status === "failed" && (
            <div className="mt-2">
              <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400"><AlertCircle size={11} />Failed{u.attempts > 1 ? ` (${u.attempts} tries)` : ""}</p>
              {u.last_error && <p className="mt-0.5 break-words text-[11px] leading-4 text-rose-600/90 dark:text-rose-400/90">{u.last_error}</p>}
              <p className="mt-0.5 text-[11px] text-slate-400">It retries by itself, or press Retry.</p>
            </div>
          )}
          {u.status === "done" && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={11} />Uploaded{u.completed_at ? ` ${formatDistanceToNow(new Date(u.completed_at), { addSuffix: true })}` : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs font-semibold">
          {u.status === "failed" && (
            <button type="button" onClick={() => void retryUpload(u.id)} className="inline-flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"><RotateCw size={12} />Retry</button>
          )}
          {u.status === "done" && u.storage_path && (
            <button
              type="button"
              onClick={() => {
                const path = u.storage_path as string;
                openFileViewer({ name: u.file_name, cacheKey: path, getUrl: () => getResourceFileUrl(path) });
              }}
              className="text-brand-600 hover:underline dark:text-brand-400"
            >
              Open
            </button>
          )}
          {(u.status === "failed" || u.status === "pending") && (
            <button type="button" onClick={() => { if (confirm("Remove this file from the upload queue? It will not be uploaded.")) void removePendingUpload(u.id); }} className="inline-flex items-center gap-1 text-rose-600 hover:underline dark:text-rose-400"><Trash2 size={12} />Remove</button>
          )}
        </div>
      </div>
    </li>
  );
}

export function UploadsManager() {
  const { user } = useUser();
  const { mode, setMode, networkOnline, triggerSync } = useSyncStatus();
  const progress = useUploadProgress();
  const uploads = useLiveQuery(() => db.pendingUploads.toArray(), [], [] as PendingUpload[]);
  const resources = useLiveQuery(() => db.resources.toArray(), [], []);
  const titleById = new Map((resources ?? []).map((r) => [r.id, r.title] as const));

  const mine = (uploads ?? []).filter((u) => !user || u.user_id === user.id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const active = mine.filter((u) => u.status === "uploading" || u.status === "pending");
  const failed = mine.filter((u) => u.status === "failed");
  const done = mine.filter((u) => u.status === "done");

  const waitingReason = mode === "offline" ? "you are in Offline mode" : !networkOnline ? "waiting for internet" : "starting soon";

  const Section = ({ title, items }: { title: string; items: PendingUpload[] }) =>
    items.length === 0 ? null : (
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title} ({items.length})</h2>
        <ul className="space-y-2.5">
          {items.map((u) => (
            <Row key={u.id} u={u} title={titleById.get(u.resource_id)} progress={progress[u.id]} waitingReason={waitingReason} />
          ))}
        </ul>
      </section>
    );

  return (
    <div>
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Uploads</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Files you attached. Offline files upload by themselves when you are back online.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => triggerSync()} disabled={mode === "offline" || !networkOnline} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500">
            <UploadCloud size={14} />Upload now
          </button>
          {failed.length > 0 && (
            <button type="button" onClick={() => void retryAllFailedUploads()} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
              Retry all failed
            </button>
          )}
          {done.length > 0 && (
            <button type="button" onClick={() => void clearFinishedUploads()} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">
              Clear finished
            </button>
          )}
        </div>
      </header>

      {mode === "offline" && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.08]">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">You are in Offline mode, so nothing uploads right now.</p>
          <button type="button" onClick={() => setMode("online")} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
            {networkOnline ? "Go Online and upload" : "Go Online"}
          </button>
        </div>
      )}

      {mine.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-white/[0.12] dark:bg-white/[0.02]">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">No uploads yet</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Attach a file to a note or task and it shows up here. <Link href="/notes" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Go to notes</Link>
          </p>
        </div>
      ) : (
        <>
          <Section title="In progress and queued" items={active} />
          <Section title="Failed" items={failed} />
          <Section title="Uploaded" items={done} />
        </>
      )}
    </div>
  );
}
