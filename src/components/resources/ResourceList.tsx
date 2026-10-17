"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { deleteResource } from "@/lib/db/repo/resources";
import { getResourceFileUrl } from "@/lib/storage/client";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import type { Resource } from "@/types/academic";
import { Select } from "@/components/ui/Select";

const TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  ppt: "Slides",
  doc: "Document",
  image: "Image",
  link: "Link",
  other: "Other",
};

type SortKey = "newest" | "oldest" | "name";

export function ResourceList({ resources }: { resources: Resource[] }) {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of resources) counts[r.resource_type] = (counts[r.resource_type] ?? 0) + 1;
    return counts;
  }, [resources]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = resources.filter((r) => (type === "all" || r.resource_type === type) && (!q || r.title.toLowerCase().includes(q)));
    return [...list].sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      return sort === "newest" ? (a.created_at < b.created_at ? 1 : -1) : a.created_at < b.created_at ? -1 : 1;
    });
  }, [resources, query, type, sort]);

  const download = async (r: Resource) => {
    if (!r.storage_path) return;
    try {
      window.open(await getResourceFileUrl(r.storage_path), "_blank", "noopener,noreferrer");
    } catch {
      showToast("Could not open the file. Check your connection and try again.", "error");
    }
  };

  if (resources.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">No resources attached yet.</p>;
  }

  const typeKeys = Object.keys(typeCounts);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100"
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-white/[0.08] dark:bg-slate-900 dark:text-slate-300"
          aria-label="Sort resources"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A-Z</option>
        </Select>
      </div>

      {typeKeys.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {[["all", "All", resources.length] as const, ...typeKeys.map((k) => [k, TYPE_LABEL[k] ?? k, typeCounts[k]] as const)].map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setType(key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                type === key
                  ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300"
              )}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400 dark:border-white/[0.12] dark:text-slate-500">
          No resources match your filters.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="min-w-0">
                <span className="font-medium text-slate-800 dark:text-slate-100">{r.title}</span>
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {TYPE_LABEL[r.resource_type] ?? r.resource_type}
                </span>
                {!r.storage_path && !r.url && <span className="ml-2 text-xs text-sync-syncing">pending upload</span>}
              </div>
              <div className="flex shrink-0 gap-3">
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                    Open
                  </a>
                )}
                {r.storage_path && (
                  <button type="button" onClick={() => void download(r)} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                    Download
                  </button>
                )}
                <button onClick={() => deleteResource(r.id)} className="text-xs font-medium text-status-overdue hover:underline">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
