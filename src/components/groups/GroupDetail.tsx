"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { getGroup, listGroupMembers, regenerateInviteCode } from "@/lib/groups/api";
import { GroupOverview } from "@/components/groups/GroupOverview";
import { GroupLibrary } from "@/components/groups/GroupLibrary";
import { GroupMembers } from "@/components/groups/GroupMembers";
import type { Group } from "@/types/groups";
import { GroupPolls } from "@/components/groups/GroupPolls";
import { GroupTasks } from "@/components/groups/GroupTasks";
const TABS = ["Overview", "Tasks", "Library", "Polls", "Members"] as const;
export function GroupDetail({ groupId }: { groupId: string }) {
  const { user } = useUser();
  const [group, setGroup] = useState<Group | null>(null);
  const [myRole, setMyRole] = useState<string>("member");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [code, setCode] = useState("");
  useEffect(() => {
    getGroup(groupId).then((g) => { setGroup(g); setCode(g?.invite_code ?? ""); });
    listGroupMembers(groupId).then((members) => {
      const mine = members.find((m) => m.user_id === user?.id);
      if (mine) setMyRole(mine.role);
    });
  }, [groupId, user?.id]);
  if (!group) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />;
  return (
    <div className="min-w-0 max-w-full">
      <header className="mb-6">
        <h1 className="break-words font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">{group.name}</h1>
        {group.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{group.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span>Invite code: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{code}</span></span>
          {myRole === "owner" && (
            <button onClick={async () => setCode(await regenerateInviteCode(groupId))} className="text-brand-600 hover:underline dark:text-brand-400">
              Regenerate
            </button>
          )}
        </div>
      </header>
      {/* Tabs: scroll sideways inside their own bar instead of stretching the whole page */}
      <div className="mb-4 max-w-full overflow-x-auto border-b border-slate-200 [scrollbar-width:none] dark:border-slate-800 [&::-webkit-scrollbar]:hidden">
        <div role="tablist" className="flex w-max min-w-full gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-medium sm:px-4 ${
                tab === t
                  ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {tab === "Overview" && <GroupOverview groupId={groupId} myRole={myRole} />}
      {tab === "Tasks" && user && <GroupTasks groupId={groupId} groupName={group.name} myRole={myRole} userId={user.id} />}
      {tab === "Library" && <GroupLibrary groupId={groupId} />}
      {tab === "Polls" && <GroupPolls groupId={groupId} myRole={myRole} />}
      {tab === "Members" && <GroupMembers groupId={groupId} myRole={myRole} />}
    </div>
  );
}