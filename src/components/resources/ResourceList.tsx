"use client";

import { deleteResource } from "@/lib/db/repo/resources";
import type { Resource } from "@/types/academic";

const TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  ppt: "Slides",
  doc: "Document",
  image: "Image",
  link: "Link",
  other: "Other",
};

export function ResourceList({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">No resources attached yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {resources.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <span className="font-medium text-slate-800 dark:text-slate-100">{r.title}</span>
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {TYPE_LABEL[r.resource_type] ?? r.resource_type}
            </span>
            {!r.storage_path && !r.url && (
              <span className="ml-2 text-xs text-sync-syncing">pending upload</span>
            )}
          </div>
          <div className="flex gap-3">
            {r.url && (
              <a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Open
              </a>
            )}
            <button onClick={() => deleteResource(r.id)} className="text-xs font-medium text-status-overdue hover:underline">
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
