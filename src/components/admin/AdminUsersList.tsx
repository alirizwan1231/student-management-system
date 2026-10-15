"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminUserRow } from "@/lib/admin/data";
const PAGE_SIZE = 20;
export function AdminUsersList() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | "student" | "admin">("all");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), role });
    if (search.trim()) params.set("search", search.trim());
    const timer = setTimeout(() => {
      fetch(`/api/admin/users?${params}`)
        .then((res) => res.json())
        .then((data) => {
          setUsers(data.users ?? []);
          setTotal(data.total ?? 0);
        })
        .finally(() => setLoading(false));
    }, 300); // debounce search typing
    return () => clearTimeout(timer);
  }, [search, role, page]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as typeof role);
            setPage(1);
          }}
className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200"
        >
          <option value="all">All roles</option>
          <option value="student">Student</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Semesters</th>
                <th className="px-4 py-3">Subjects</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
                        {u.full_name || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.role === "admin" ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.counts.semester_count}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.counts.subject_count}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.counts.task_count}</td>
                    <td className="px-4 py-3">
                      {u.disabled_at ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">Disabled</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Active</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{total} users total</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-white/[0.08]"
          >
            <ChevronLeft size={14} />
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 dark:border-white/[0.08]"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
