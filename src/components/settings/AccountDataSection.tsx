"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { clearCachedUser, useUser } from "@/hooks/useUser";
import { errorBoxClass, inputClass } from "@/components/auth/authStyles";

const EXPORT_TABLES = ["semesters", "subjects", "lecturers", "lectures", "tasks", "resources", "timetableSlots", "timetableExceptions", "attendanceRecords", "exams", "gradeEntries"] as const;

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
      // Fix 10 (audit M-4): the export used to omit grades, ALL group data,
      // the profile name and any usable file reference. exportVersion 2
      // includes every table the user can write to.
      const out: Record<string, unknown> = { exportVersion: 2, exported_at: new Date().toISOString(), account: { id: user.id, email: user.email } };
      for (const name of EXPORT_TABLES) {
        const rows = await db.table(name).where("user_id").equals(user.id).toArray();
        out[name] = rows.filter((r: { deleted_at?: string | null }) => !r.deleted_at);
      }
      try {
        const supabase = createClient();
        const { data: profile } = await supabase.from("profiles").select("id, full_name, email, created_at").eq("id", user.id).single();
        out.profile = profile ?? null;
        const { data: memberships } = await supabase.from("group_members").select("*").eq("user_id", user.id);
        out.groupMemberships = memberships ?? [];
        const groupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id);
        if (groupIds.length > 0) {
          const { data: groups } = await supabase.from("groups").select("id, name, description, created_at").in("id", groupIds);
          out.groups = groups ?? [];
        } else {
          out.groups = [];
        }
        const [ann, com, polls] = await Promise.all([
          supabase.from("group_announcements").select("*").eq("posted_by", user.id),
          supabase.from("group_comments").select("*").eq("user_id", user.id),
          supabase.from("group_polls").select("*").eq("created_by", user.id),
        ]);
        out.myGroupAnnouncements = ann.data ?? [];
        out.myGroupComments = com.data ?? [];
        out.myGroupPolls = polls.data ?? [];
        // File manifest: a short-lived (60s) download URL per uploaded file,
        // generated at export time. Download promptly; re-export for fresh links.
        const resources = (out.resources as { id: string; title: string; storage_path: string | null }[]) ?? [];
        out.fileManifest = await Promise.all(
          resources
            .filter((r) => r.storage_path)
            .map(async (r) => {
              let downloadUrl: string | null = null;
              try {
                const res = await fetch(`/api/storage/download?path=${encodeURIComponent(r.storage_path as string)}`);
                if (res.ok) downloadUrl = ((await res.json()) as { url?: string }).url ?? null;
              } catch { /* offline export: manifest still lists the path */ }
              return { resourceId: r.id, title: r.title, storagePath: r.storage_path, downloadUrl };
            })
        );
      } catch { /* group/profile data is best-effort if offline; local tables above are the core export */ }
      out.note = "File contents are not embedded in this JSON. fileManifest lists every uploaded file with a short-lived download URL (about 60 seconds); re-run the export for fresh links.";
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
            <p className="text-xs text-slate-400 dark:text-slate-500">A JSON file with your profile, semesters, subjects, notes, tasks, timetable, attendance, exams, grades, groups (memberships and content you authored) and a manifest of your uploaded files with download links.</p>
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
