"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listRecentGroupActivity, type RecentActivityItem } from "@/lib/groups/api";
export function RecentGroupActivity() {
  const [items, setItems] = useState<RecentActivityItem[] | null>(null);
  useEffect(() => {
    listRecentGroupActivity(8).then(setItems).catch(() => setItems([]));
  }, []);
  if (items === null) return null; // silent while loading/offline -- never blocks the rest of the dashboard
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 dark:border-white/[0.06] dark:bg-white/[0.015]">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Recent Group Activity</h2>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/groups/${item.groupId}`} className="flex items-center justify-between gap-2 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
              <span className="truncate">
                <strong className="font-semibold">{item.by}</strong> {item.type === "announcement" ? "posted" : "shared"} <em className="not-italic">{item.title}</em> in {item.groupName}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
