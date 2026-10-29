"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { SearchResult } from "@/lib/admin/data";
export function AdminGlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-slate-900 dark:text-white">Search</h1>
      <div className="relative mb-4">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users, subjects, lectures, tasks, resources..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100"
        />
      </div>
      {loading && <p className="text-sm text-slate-400">Searching...</p>}
      <ul className="space-y-2">
        {results.map((r) => (
          <li key={`${r.kind}-${r.id}`}>
            <Link
              href={r.href}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 hover:border-slate-300 dark:border-white/[0.07] dark:bg-white/[0.025]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{r.title}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {r.kind} — {r.ownerName}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                {r.kind}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
