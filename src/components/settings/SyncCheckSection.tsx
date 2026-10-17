"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, AlertTriangle, RefreshCw, XCircle } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useSyncStatus } from "@/lib/sync/context";
import { runDiagnostics, type TableDiagnostic } from "@/lib/sync/diagnostics";
import { drainPendingUploads } from "@/lib/sync/uploads";
import { resetSyncWatermarks } from "@/lib/sync/pull";
import { cn } from "@/lib/utils/cn";

function verdict(d: TableDiagnostic) {
  if (d.error) return { icon: XCircle, tone: "text-rose-600 dark:text-rose-400", text: "Problem" };
  if (d.cloud === null) return { icon: XCircle, tone: "text-rose-600 dark:text-rose-400", text: "Cannot read" };
  if (d.local < d.cloud) return { icon: AlertTriangle, tone: "text-amber-600 dark:text-amber-400", text: `${d.cloud - d.local} missing here` };
  if (d.local > d.cloud || d.waiting > 0) return { icon: AlertTriangle, tone: "text-amber-600 dark:text-amber-400", text: "Not uploaded yet" };
  return { icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400", text: "OK" };
}

// Shows, table by table, whether this device and the cloud agree, and can
// retry uploads / re-download everything if something is missing.
export function SyncCheckSection() {
  const { user } = useUser();
  const { triggerSync } = useSyncStatus();
  const [rows, setRows] = useState<TableDiagnostic[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const check = async () => {
    if (!user) return;
    setBusy(true);
    setNote(null);
    try {
      setRows(await runDiagnostics(user.id));
    } catch {
      setNote("Could not run the check. Are you online?");
    }
    setBusy(false);
  };

  const run = async (label: string, action: () => Promise<unknown>) => {
    if (!user) return;
    setBusy(true);
    setNote(label);
    try {
      await action();
    } catch {
      setNote("That action failed. Please try again.");
      setBusy(false);
      return;
    }
    triggerSync();
    setTimeout(async () => {
      try {
        setRows(await runDiagnostics(user.id));
        setNote("Done. Any row that still says Problem shows the exact reason; please send it to support.");
      } catch {
        setNote("Finished, but the check could not run.");
      }
      setBusy(false);
    }, 5000);
  };

  const hasIssue = rows?.some((d) => verdict(d).text !== "OK");

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-white/[0.06]">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sync check</h2>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Something added on another device is missing here, or the other way round? Check it, then retry.
        </p>
      </div>
      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={check} disabled={busy || !user} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/[0.1] dark:text-slate-200 dark:hover:bg-white/[0.04]">
            <RefreshCw size={13} className={cn(busy && "animate-spin")} />
            Check now
          </button>
          <button type="button" onClick={() => run("Retrying uploads...", drainPendingUploads)} disabled={busy || !user} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/[0.1] dark:text-slate-200 dark:hover:bg-white/[0.04]">
            Retry uploads
          </button>
          <button type="button" onClick={() => run("Downloading everything again...", resetSyncWatermarks)} disabled={busy || !user} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500">
            Re-download all my data
          </button>
        </div>
        {note && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{note}</p>}
        {rows && (
          <>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/[0.06] dark:border-white/[0.08]">
              {rows.map((d) => {
                const v = verdict(d);
                const Icon = v.icon;
                return (
                  <li key={d.table} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{d.label}</span>
                      <span className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                        <span>Here {d.local}</span>
                        <span>Cloud {d.cloud ?? "?"}</span>
                        <span className={cn("inline-flex items-center gap-1 font-semibold", v.tone)}>
                          <Icon size={13} />
                          {v.text}
                        </span>
                      </span>
                    </div>
                    {d.error && <p className="mt-1 break-words text-[11px] text-rose-600 dark:text-rose-400">Problem: {d.error}</p>}
                    {d.lastSyncedAt && !d.error && (
                      <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Last synced {formatDistanceToNow(new Date(d.lastSyncedAt), { addSuffix: true })}</p>
                    )}
                  </li>
                );
              })}
            </ul>
            {hasIssue && <p className="text-xs text-slate-500 dark:text-slate-400">Tip: "Retry uploads" for rows marked "Not uploaded yet", "Re-download all my data" for rows marked "missing here".</p>}
          </>
        )}
      </div>
    </section>
  );
}