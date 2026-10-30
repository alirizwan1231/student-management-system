"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, PackageOpen } from "lucide-react";
import { listMyGroups } from "@/lib/groups/api";
import { getClassPack } from "@/lib/classpack/api";
import { diffPack, readLinks, type PackDiff } from "@/lib/classpack/links";
import { importPack } from "@/lib/classpack/import";
import { defaultChoice, type ClassPack, type ImportReport, type Selection } from "@/lib/classpack/types";

interface PackState {
  groupId: string;
  groupName: string;
  pack: ClassPack;
  diff: PackDiff;
  importedVersion: number; // 0 = never imported on this device
  busy: boolean;
  message: string | null;
  error: string | null;
}

const pendingOf = (s: PackState) => s.diff.newCount + s.diff.changedCount + s.diff.removedCount;

function summarise(report: ImportReport): string {
  const added =
    report.subjectsAdded + report.instructorsAdded + report.classesAdded +
    report.notesAdded + report.filesAdded + report.tasksAdded + report.examsAdded;
  const parts: string[] = [];
  if (added > 0) parts.push(`${added} new item${added === 1 ? "" : "s"} added`);
  if (report.itemsUpdated > 0) parts.push(`${report.itemsUpdated} updated`);
  if (report.removed.length > 0) parts.push(`${report.removed.length} removed (no longer in the pack)`);
  if (parts.length === 0 && report.conflicts.length === 0) parts.push("Already up to date");
  let text = parts.join(" · ") + ".";
  if (report.conflicts.length > 0) {
    text += ` ${report.conflicts.length} item${report.conflicts.length === 1 ? "" : "s"} you edited yourself were kept as they are.`;
  }
  return text;
}

// The dashboard's Class Pack section: for every group you belong to, shows
// the latest published pack and what is new since your last import, with a
// one-click import. The import reuses the exact engine of the group page's
// Class Pack tab -- unchanged items are skipped, changed items update, and
// items you edited yourself are never overwritten.
//
// Groups YOU created (and packs you published yourself) are left out on
// purpose: the pack is built from your own subjects, timetable, notes,
// tasks and exams, so there is nothing for you to import -- every other
// member still sees the import option as before.
export function ClassPackUpdates({ userId }: { userId: string }) {
  const [states, setStates] = useState<PackState[] | null>(null);
  const [importingAll, setImportingAll] = useState(false);

  const loadOne = useCallback(async (groupId: string, groupName: string): Promise<PackState | null> => {
    const pack = await getClassPack(groupId).catch(() => null);
    if (!pack) return null;
    if (pack.published_by === userId) return null; // my own pack: already my data
    const links = await readLinks(groupId).catch(() => null);
    return {
      groupId,
      groupName,
      pack,
      diff: diffPack(pack.payload, links),
      importedVersion: links?.version ?? 0,
      busy: false,
      message: null,
      error: null,
    };
  }, [userId]);

  const load = useCallback(async () => {
    try {
      const groups = await listMyGroups();
      // Skip groups I created before fetching anything: no import option
      // (and no wasted requests) for the Admin's own groups.
      const importable = groups.filter((g) => g.owner_id !== userId && g.role !== "owner");
      const rows = await Promise.all(importable.map((g) => loadOne(g.id, g.name).catch(() => null)));
      setStates(rows.filter((r): r is PackState => r !== null));
    } catch {
      setStates([]);
    }
  }, [loadOne, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runImport = useCallback(
    async (target: PackState): Promise<void> => {
      setStates((prev) => prev?.map((s) => (s.groupId === target.groupId ? { ...s, busy: true, error: null, message: null } : s)) ?? prev);
      try {
        const selection: Selection = {};
        target.pack.payload.subjects.forEach((s) => {
          selection[s.key] = defaultChoice(s, true);
        });
        const report = await importPack(userId, target.pack, selection, { mode: "match" });
        const fresh = await loadOne(target.groupId, target.groupName);
        setStates((prev) =>
          prev?.map((s) =>
            s.groupId === target.groupId
              ? { ...(fresh ?? s), busy: false, message: summarise(report), error: null }
              : s
          ) ?? prev
        );
      } catch {
        setStates((prev) =>
          prev?.map((s) =>
            s.groupId === target.groupId
              ? { ...s, busy: false, error: "Import failed. If you are offline, reconnect and try again." }
              : s
          ) ?? prev
        );
      }
    },
    [loadOne, userId]
  );

  const importAll = async () => {
    if (!states || importingAll) return;
    setImportingAll(true);
    for (const s of states) {
      if (pendingOf(s) > 0 || s.importedVersion === 0) await runImport(s);
    }
    setImportingAll(false);
  };

  // No group has published a pack (or nothing could be loaded): stay invisible.
  if (!states || states.length === 0) return null;

  const totalPending = states.reduce((sum, s) => sum + pendingOf(s), 0);
  const anyNeverImported = states.some((s) => s.importedVersion === 0);

  return (
    <section className="mb-6 rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-50/80 to-white p-5 shadow-sm dark:border-brand-500/20 dark:from-brand-500/[0.07] dark:to-white/[0.02]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/25">
            <PackageOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Class Pack updates</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The latest subjects, timetable, notes, tasks and exams published by your class Admin or CR.
            </p>
          </div>
        </div>
        {(totalPending > 0 || anyNeverImported) && (
          <button
            onClick={importAll}
            disabled={importingAll}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-brand-600/20 transition-all hover:bg-brand-700 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {importingAll ? "Importing..." : "Import all updates"}
          </button>
        )}
      </div>

      <ul className="space-y-2.5">
        {states.map((s) => {
          const pending = pendingOf(s);
          const upToDate = pending === 0 && s.importedVersion > 0;
          return (
            <li
              key={s.groupId}
              className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-white/[0.07] dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {s.groupName}
                  <span className="ml-2 align-middle text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {s.pack.title} · pack v{s.pack.version}
                    {s.importedVersion > 0 ? ` · you have v${s.importedVersion}` : " · not imported yet"}
                  </span>
                </p>
                {upToDate ? (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> You&apos;re up to date
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {s.diff.newCount > 0 && <span className="font-bold text-brand-600 dark:text-brand-400">{s.diff.newCount} new</span>}
                    {s.diff.newCount > 0 && s.diff.changedCount > 0 && " · "}
                    {s.diff.changedCount > 0 && <span className="font-bold text-amber-600 dark:text-amber-400">{s.diff.changedCount} updated</span>}
                    {(s.diff.newCount > 0 || s.diff.changedCount > 0) && s.diff.removedCount > 0 && " · "}
                    {s.diff.removedCount > 0 && <span className="font-bold text-rose-600 dark:text-rose-400">{s.diff.removedCount} to remove</span>}
                    {pending === 0 && s.importedVersion === 0 && "Ready to import"}
                  </p>
                )}
                {s.message && <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">{s.message}</p>}
                {s.error && <p className="mt-1 text-xs font-medium text-status-overdue">{s.error}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/groups/${s.groupId}?tab=Class%20Pack`}
                  className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  Open
                </Link>
                {!upToDate && (
                  <button
                    onClick={() => void runImport(s)}
                    disabled={s.busy || importingAll}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {s.busy ? "Importing..." : s.importedVersion === 0 ? "Import pack" : "Import updates"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
