"use client";
import { useState } from "react";
export function AdminRoleControl({
  userId,
  role,
  disabledAt,
  isSelf,
  onChanged,
}: {
  userId: string;
  role: "student" | "admin";
  disabledAt: string | null;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const changeRole = async (newRole: "student" | "admin") => {
    if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(body.error || "Could not change role.");
      return;
    }
    onChanged();
  };
  const toggleStatus = async () => {
    const action = disabledAt ? "restore" : "disable";
    if (!window.confirm(`${action === "disable" ? "Disable" : "Restore"} this account?`)) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(body.error || "Could not update status.");
      return;
    }
    onChanged();
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {role === "student" ? (
        <button disabled={busy} onClick={() => changeRole("admin")} className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 disabled:opacity-60 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
          Promote to admin
        </button>
      ) : (
        <button disabled={busy || isSelf} onClick={() => changeRole("student")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-60 dark:border-white/[0.08] dark:text-slate-300">
          Demote to student
        </button>
      )}
      <button disabled={busy || isSelf} onClick={toggleStatus} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-60 dark:border-rose-500/20 dark:text-rose-400">
        {disabledAt ? "Restore account" : "Disable account"}
      </button>
      {message && <p className="w-full text-xs font-medium text-status-overdue">{message}</p>}
    </div>
  );
}
