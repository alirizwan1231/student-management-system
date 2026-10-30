"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useUser";
import { listGroupMembers, memberRoleText, removeMember, setMemberRole, leaveGroup } from "@/lib/groups/api";
import type { GroupMember } from "@/types/groups";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
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
  // Promoting now asks for a tag: the owner picks what the promoted member
  // is called (CR, GR, or anything else). The tag is saved with the role.
  const [tagTarget, setTagTarget] = useState<GroupMember | null>(null);
  const [tagValue, setTagValue] = useState("CR");
  const [savingTag, setSavingTag] = useState(false);
  const openTagDialog = (m: GroupMember) => {
    setTagTarget(m);
    setTagValue(m.role_label?.trim() || "CR");
  };
  const saveTag = async () => {
    if (!tagTarget) return;
    setSavingTag(true);
    try {
      await setMemberRole(groupId, tagTarget.user_id, "moderator", tagValue.trim() || "CR");
      setTagTarget(null);
      load();
    } catch {
      window.alert("Could not save the tag. Check your internet connection and try again.");
    } finally {
      setSavingTag(false);
    }
  };
  return (
    <div className="space-y-2">
      {members.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.profiles?.full_name || "Unnamed member"}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{memberRoleText(effectiveRole(m), m.role_label)} · joined {new Date(m.joined_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            {myRole === "owner" && effectiveRole(m) !== "owner" && (
              m.role === "moderator" ? (
                <>
                  <button onClick={() => openTagDialog(m)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                    Edit tag
                  </button>
                  <button
                    onClick={() => setMemberRole(groupId, m.user_id, "member").then(load)}
                    className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Demote
                  </button>
                </>
              ) : (
                <button onClick={() => openTagDialog(m)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">
                  Promote
                </button>
              )
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

      {tagTarget && (
        <Modal title={tagTarget.role === "moderator" ? "Edit member tag" : `Promote ${tagTarget.profiles?.full_name || "member"}`} onClose={() => setTagTarget(null)}>
          <div className="space-y-4 p-1">
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Give this member a tag. It shows next to their role everywhere in the group, and they get moderator
              rights — they can publish and update the Class Pack.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500" htmlFor="member-tag">
                Tag
              </label>
              <input
                id="member-tag"
                value={tagValue}
                onChange={(e) => setTagValue(e.target.value)}
                maxLength={24}
                placeholder="CR"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-100"
              />
              <div className="mt-2 flex gap-1.5">
                {["CR", "GR"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTagValue(preset)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      tagValue.trim().toUpperCase() === preset
                        ? "border-brand-500 bg-brand-600 text-white dark:bg-brand-500"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                <span className="self-center text-[11px] text-slate-400 dark:text-slate-500">or type any tag you like</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTagTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTag}
                disabled={savingTag}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-400"
              >
                {savingTag ? "Saving..." : tagTarget.role === "moderator" ? "Save tag" : "Promote"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
