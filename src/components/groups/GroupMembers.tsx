"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { listGroupMembers, removeMember, setMemberRole, leaveGroup } from "@/lib/groups/api";
import type { GroupMember } from "@/types/groups";
import { useRouter } from "next/navigation";
export function GroupMembers({ groupId, myRole }: { groupId: string; myRole: string }) {
  const router = useRouter();
  const { user } = useUser();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const load = () => listGroupMembers(groupId).then(setMembers);
  useEffect(() => { load(); }, [groupId]);
  const canManage = myRole === "owner" || myRole === "moderator";
  return (
    <div className="space-y-2">
      {members.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.profiles?.full_name || "Unnamed member"}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{m.role} · joined {new Date(m.joined_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            {myRole === "owner" && m.role !== "owner" && (
              <button
                onClick={() => setMemberRole(groupId, m.user_id, m.role === "moderator" ? "member" : "moderator").then(load)}
                className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                {m.role === "moderator" ? "Demote" : "Promote"}
              </button>
            )}
            {canManage && m.role !== "owner" && m.user_id !== user?.id && (
              <button onClick={() => removeMember(groupId, m.user_id).then(load)} className="text-xs font-semibold text-status-overdue hover:underline">
                Remove
              </button>
            )}
            {m.user_id === user?.id && m.role !== "owner" && (
              <button onClick={() => leaveGroup(groupId).then(() => router.push("/groups"))} className="text-xs font-semibold text-status-overdue hover:underline">
                Leave
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
