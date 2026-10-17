"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { listMyGroups } from "@/lib/groups/api";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { JoinGroupModal } from "@/components/groups/JoinGroupModal";
export function GroupsList() {
  const { user } = useUser();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    listMyGroups().then(setGroups).finally(() => setLoading(false));
  }, [user]);
  return (
    <div>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">Groups</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Shared study workspaces you're part of.</p>
        </div>
        {/* Two equal buttons side by side on phones, natural width on desktop */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 [&>button]:justify-center [&>button]:whitespace-nowrap">
          <JoinGroupModal />
          <CreateGroupModal />
        </div>
      </div>
      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-white/[0.12]">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No groups yet</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Create a group or join one with an invite code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-[2px] hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold text-slate-900 dark:text-white">{g.name}</h2>
              {g.description && <p className="mt-1 line-clamp-2 text-xs text-slate-400 dark:text-slate-500">{g.description}</p>}
              <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{g.member_count} members · your role: {g.role}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
