"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { clearCachedUser, useUser } from "@/hooks/useUser";
import { errorBoxClass, inputClass } from "@/components/auth/authStyles";

const EXPORT_TABLES = ["semesters", "subjects", "lecturers", "lectures", "tasks", "resources", "timetableSlots", "timetableExceptions", "attendanceRecords", "exams"] as const;

export function AccountDataSection() {
  const { user } = useUser();
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const out: Record<string, unknown> = { exported_at: new Date().toISOString(), account: { id: user.id, email: user.email } };
      for (const name of EXPORT_TABLES) {
        const rows = await db.table(name).where("user_id").equals(user.id).toArray();
        out[name] = rows.filter((r: { deleted_at?: string | null }) => !r.deleted_at);
      }
      out.note = "File contents are not included; download attachments from within the app. Resource rows list their files.";
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `university-manager-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: typed }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete your account.");
      await db.delete().catch(() => undefined);
      clearCachedUser();
      navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_CACHES" });
      await createClient().auth.signOut().catch(() => undefined);
      window.location.href = "/login";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account.");
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-white/[0.06]">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Your data and privacy</h2>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          Read our <Link href="/privacy" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Privacy Policy</Link>,{" "}
          <Link href="/terms" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">Terms</Link> or{" "}
          <Link href="/contact" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">contact support</Link>.
        </p>
      </div>
      <div className="space-y-5 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Download my data</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">A JSON file with your semesters, subjects, notes, tasks, timetable, attendance and exams.</p>
          </div>
          <button type="button" onClick={exportData} disabled={!user || exporting} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/[0.1] dark:text-slate-200 dark:hover:bg-white/[0.04]">
            <Download size={14} />
            {exporting ? "Preparing..." : "Download"}
          </button>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/20 dark:bg-rose-500/[0.05]">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Delete my account</p>
              <p className="mt-0.5 text-xs leading-5 text-rose-600/80 dark:text-rose-300/70">
                Permanently deletes your account, all your data and uploaded files. This cannot be undone.
              </p>
              {!confirming ? (
                <button type="button" onClick={() => setConfirming(true)} className="mt-3 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700">
                  Delete account...
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type DELETE to confirm" className={inputClass} />
                  {error && <p className={errorBoxClass}>{error}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={deleteAccount} disabled={busy || typed !== "DELETE"} className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                      {busy ? "Deleting..." : "Permanently delete"}
                    </button>
                    <button type="button" onClick={() => { setConfirming(false); setTyped(""); setError(null); }} className="rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/[0.05]">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
