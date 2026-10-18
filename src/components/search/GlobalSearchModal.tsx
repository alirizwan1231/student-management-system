"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { searchLocal, type LocalSearchResult } from "@/lib/search/localSearch";
import { searchMyGroupsContent, type GroupSearchResult } from "@/lib/groups/api";
type Combined = (LocalSearchResult | GroupSearchResult) & { source: "personal" | "group" };
export function GlobalSearchModal() {
  const router = useRouter();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Combined[]>([]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (!user || query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const [local, group] = await Promise.all([
        searchLocal(user.id, query),
        searchMyGroupsContent(query).catch(() => [] as GroupSearchResult[]),
      ]);
      setResults([
        ...local.map((r) => ({ ...r, source: "personal" as const })),
        ...group.map((r) => ({ ...r, source: "group" as const })),
      ]);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, user]);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400"
      >
        <Search size={14} /> Search <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-white/[0.06]">Ctrl K</kbd>
      </button>
    );
  }
return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-24" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-100 p-3 dark:border-white/[0.06]">
          <Search size={16} className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects, notes, tasks, resources, groups..."
            className="flex-1 bg-transparent text-sm outline-none dark:text-slate-100"
          />
          <button onClick={() => setOpen(false)}><X size={16} className="text-slate-400" /></button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="p-4 text-center text-xs text-slate-400">Type at least 2 characters...</p>
          ) : results.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-400">No results found.</p>
          ) : (
            results.map((r) => (
              <button
                key={`${r.source}-${r.kind}-${r.id}`}
                onClick={() => { router.push(r.href); setOpen(false); setQuery(""); }}
                className="flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{r.title}</p>
                  <p className="truncate text-xs text-slate-400">{r.subtitle}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:bg-white/[0.06]">{r.kind}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
