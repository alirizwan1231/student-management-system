"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { groupRoleLabel, listGroupMembers, removeMember, setMemberRole, leaveGroup } from "@/lib/groups/api";
import type { GroupMember } from "@/types/groups";
import { useRouter } from "next/navigation";
export function GroupMembers({ groupId, myRole, ownerId }: { groupId: string; myRole: string; ownerId?: string }) {
  const router = useRouter();
  const { user } = useUser();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const load = () => listGroupMembers(groupId).then(setMembers);
  useEffect(() => { load(); }, [groupId]);
  const canManage = myRole === "owner" || myRole === "moderator";
  // The group's creator is the Admin/owner no matter what an old
  // membership row says -- groups.owner_id wins.
  const effectiveRole = (m: GroupMember) => (ownerId && m.user_id === ownerId ? "owner" : m.role);
  return (
    <div className="space-y-2">
      {members.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.profiles?.full_name || "Unnamed member"}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{groupRoleLabel(effectiveRole(m))}{effectiveRole(m) === "moderator" ? " (CR)" : ""} · joined {new Date(m.joined_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            {myRole === "owner" && effectiveRole(m) !== "owner" && (
              <button
                onClick={() => setMemberRole(groupId, m.user_id, m.role === "moderator" ? "member" : "moderator").then(load)}
                className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                {m.role === "moderator" ? "Demote" : "Promote"}
              </button>
            )}
            {canManage && effectiveRole(m) !== "owner" && m.user_id !== user?.id && (
              <button onClick={() => removeMember(groupId, m.user_id).then(load)} className="text-xs font-semibold text-status-overdue hover:underline">
                Remove
              </button>
            )}
            {m.user_id === user?.id && effectiveRole(m) !== "owner" && (
              <button
                onClick={() => {
                  if (!window.confirm("Leave this group? You can rejoin later with a new invite code.")) return;
                  leaveGroup(groupId).then(() => router.push("/groups")).catch(() => window.alert("Could not leave the group. Check your internet connection and try again."));
                }}
                className="text-xs font-semibold text-status-overdue hover:underline"
              >
                Leave
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
