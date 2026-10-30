"use client";
import { useEffect, useState } from "react";
interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  target_record_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
export function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    fetch(`/api/admin/audit?page=${page}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      });
  }, [page]);
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-slate-900 dark:text-white">Audit Log</h1>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{e.action}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {new Date(e.created_at).toLocaleString(undefined, { hour12: true })}
              {e.target_user_id && ` • target user ${e.target_user_id}`}
            </p>
            {e.metadata && (
              <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-2 text-[11px] text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                {JSON.stringify(e.metadata, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{total} entries</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/[0.08]">Prev</button>
          <button disabled={entries.length < 25} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/[0.08]">Next</button>
        </div>
      </div>
    </div>
  );
}
