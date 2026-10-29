"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { deleteGroup, getGroup, getGroupInviteCode, groupRoleLabel, leaveGroup, listGroupMembers, regenerateInviteCode } from "@/lib/groups/api";
import { GroupOverview } from "@/components/groups/GroupOverview";
import { GroupLibrary } from "@/components/groups/GroupLibrary";
import { GroupMembers } from "@/components/groups/GroupMembers";
import type { Group } from "@/types/groups";
import { GroupPolls } from "@/components/groups/GroupPolls";
import { GroupTasks } from "@/components/groups/GroupTasks";
import { ClassPackTab } from "@/components/classpack/ClassPackTab";
const TABS = ["Overview", "Class Pack", "Tasks", "Library", "Polls", "Members"] as const;
export function GroupDetail({ groupId }: { groupId: string }) {
  const { user } = useUser();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [groupLoaded, setGroupLoaded] = useState(false);
  const [myRole, setMyRole] = useState<string>(""); // "" = role not loaded yet (show neither the code nor the member note)
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    getGroup(groupId).then((g) => {
      setGroup(g);
      setGroupLoaded(true);
      // The creator is the owner/Admin by definition -- groups.owner_id is
      // the source of truth, so resolve that role immediately instead of
      // depending only on the membership row (which older data got wrong,
      // making creators show up as plain members).
      if (g && user?.id && g.owner_id === user.id) setMyRole("owner");
    }).catch(() => {
      // Offline with nothing cached: keep the loading pulse rather than
      // wrongly claiming the group was deleted.
      if (typeof navigator === "undefined" || navigator.onLine) setGroupLoaded(true);
    });
    // Returns a code only for owners/moderators; "" for plain members.
    getGroupInviteCode(groupId).then((c) => setCode(c)).catch(() => undefined);
    listGroupMembers(groupId).then((members) => {
      const mine = members.find((m) => m.user_id === user?.id);
      if (mine) setMyRole((prev) => (prev === "owner" ? prev : mine.role));
    });
  }, [groupId, user?.id]);
  const handleLeave = async () => {
    if (!window.confirm("Leave this group? You will lose access to its shared items, tasks and class pack. You can rejoin later with a new invite code.")) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await leaveGroup(groupId);
      router.push("/groups");
    } catch {
      setActionError("Could not leave the group. Group actions need an internet connection -- check you are online and try again.");
      setActionBusy(false);
    }
  };
  const handleDelete = async () => {
    if (!window.confirm(`Delete "${group?.name}" for everyone? All members will lose access to this group, its shared items, tasks, polls and class pack. This cannot be undone from the app.`)) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await deleteGroup(groupId);
      router.push("/groups");
    } catch {
      setActionError("Could not delete the group. Group actions need an internet connection -- check you are online and try again.");
      setActionBusy(false);
    }
  };
  // links and notifications can open a specific tab, e.g. /groups/<id>?tab=Class%20Pack
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab");
    if (wanted && (TABS as readonly string[]).includes(wanted)) setTab(wanted as (typeof TABS)[number]);
  }, []);
  if (!group) {
    if (groupLoaded) {
      // Deleted (migration 028 soft-delete) or never existed: say so with a
      // way back instead of pulsing forever -- old notification links land here.
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-white/[0.12]">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">This group is no longer available</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">It may have been deleted by its owner.</p>
          <button onClick={() => router.push("/groups")} className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Back to groups
          </button>
        </div>
      );
    }
    return <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />;
  }
  return (
    <div className="min-w-0 max-w-full">
      <header className="mb-6">
        <h1 className="break-words font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">{group.name}</h1>
        {group.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{group.description}</p>}
        {/* Fix 7 (audit M-1): plain members must not see the invite code --
            any member who can read it can re-share it forever. Only the
            owner and moderators get the code/link; regeneration stays
            owner-only. Until the viewer's role is known we show nothing. */}
        {myRole === "owner" || myRole === "moderator" ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span>Invite code: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{code}</span></span>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="text-brand-600 hover:underline dark:text-brand-400"
          >
            {copied ? "Link copied" : "Copy invite link"}
          </button>
          {myRole === "owner" && (
            <button onClick={async () => setCode(await regenerateInviteCode(groupId))} className="text-brand-600 hover:underline dark:text-brand-400">
              Regenerate
            </button>
          )}
        </div>
        ) : myRole === "member" ? (
          <p className="mt-2 text-xs text-slate-400">Ask the group owner for an invite link if you need to invite someone.</p>
        ) : null}
        {/* Your role + the two group-level actions, always visible in the
            header (previously Leave was buried in the Members tab and
            Delete did not exist at all). The owner cannot "leave" -- an
            owner deletes the group instead, which the leave_group RPC
            also enforces server-side. */}
        {myRole && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              Your role: {groupRoleLabel(myRole)}
            </span>
            {myRole === "owner" ? (
              <button type="button" onClick={handleDelete} disabled={actionBusy} className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/10">
                Delete group
              </button>
            ) : (
              <button type="button" onClick={handleLeave} disabled={actionBusy} className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/10">
                Leave group
              </button>
            )}
          </div>
        )}
        {actionError && <p className="mt-2 text-xs font-medium text-status-overdue">{actionError}</p>}
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
      {tab === "Class Pack" && <ClassPackTab groupId={groupId} myRole={myRole} />}
      {tab === "Tasks" && user && <GroupTasks groupId={groupId} groupName={group.name} myRole={myRole} userId={user.id} />}
      {tab === "Library" && <GroupLibrary groupId={groupId} />}
      {tab === "Polls" && <GroupPolls groupId={groupId} myRole={myRole} />}
      {tab === "Members" && <GroupMembers groupId={groupId} myRole={myRole} ownerId={group.owner_id} />}
    </div>
  );
}
