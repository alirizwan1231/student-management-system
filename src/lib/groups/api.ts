"use client";
import { getGroupmateNames, getGroupmateProfiles, type NameMap } from "@/lib/groups/profiles";
import { withReadCache } from "@/lib/groups/readCache";
import { createClient } from "@/lib/supabase/client";
import type {
  Group, GroupMember, GroupSharedItem, GroupAnnouncement, GroupComment,
  GroupNotification, SharedSourceType,
} from "@/types/groups";
// Friendly labels for group roles. The group's creator is the Admin --
// that is the word people actually use for the person running a class
// group (owner = Admin, moderator = a promoted CR, member = everyone else).
export function groupRoleLabel(role: string): string {
  if (role === "owner") return "Admin";
  if (role === "moderator") return "Moderator";
  return "Member";
}

// The full role text for a member, including their custom tag when the
// owner gave one at promote time ("Moderator (GR)"). "CR" is the default
// tag for a moderator without a custom one.
export function memberRoleText(role: string, roleLabel?: string | null): string {
  if (role === "moderator") return `Moderator (${roleLabel?.trim() || "CR"})`;
  return groupRoleLabel(role);
}
async function listMyGroups_online(): Promise<(Group & { member_count: number; role: string; role_label?: string | null })[]> {
  const supabase = createClient();
  const { data: memberships, error } = await supabase.from("group_members").select("group_id, role");
  if (error) throw error;
  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (groupIds.length === 0) return [];
  // Soft-deleted groups (migration 028 delete_group) must disappear from
  // everyone's list at once.
  const { data: groups, error: gErr } = await supabase.from("groups").select("id, owner_id, name, description, subject_id, semester_id, avatar_url, created_at, updated_at, deleted_at").in("id", groupIds).is("deleted_at", null);
  if (gErr) throw gErr;
  const { data: allMembers } = await supabase.from("group_members").select("group_id").in("group_id", groupIds);
  const counts = new Map<string, number>();
  for (const m of allMembers ?? []) counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
  const roleByGroup = new Map((memberships ?? []).map((m) => [m.group_id, m.role]));
  // Custom promote tags (migration 029). Read separately and tolerantly:
  // before the migration runs this query just returns an error and every
  // label stays empty, instead of breaking the whole groups list.
  const labelByGroup = new Map<string, string | null>();
  const { data: labelRows } = await supabase.from("group_members").select("group_id, role_label").in("group_id", groupIds);
  for (const r of labelRows ?? []) labelByGroup.set(r.group_id, (r as { role_label?: string | null }).role_label ?? null);
  const { data: sessionData } = await supabase.auth.getSession();
  const myId = sessionData.session?.user?.id;
  return (groups ?? []).map((g) => ({
    ...g,
    member_count: counts.get(g.id) ?? 0,
    // The creator is ALWAYS the owner/Admin, even if an old membership row
    // somehow carries a different role -- owner_id is the source of truth.
    role: myId && g.owner_id === myId ? "owner" : roleByGroup.get(g.id) ?? "member",
    role_label: labelByGroup.get(g.id) ?? null,
  }));
}
export async function createGroup(input: { name: string; description?: string; subject_id?: string | null; semester_id?: string | null }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_group", {
    p_name: input.name,
    p_description: input.description ?? null,
    p_subject_id: input.subject_id ?? null,
    p_semester_id: input.semester_id ?? null,
  });
  if (error) throw error;
  return data as Group;
}
export async function joinGroupByCode(code: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_group_by_code", { p_code: code });
  if (error) throw error;
  // Migration 027: the RPC returns only { id, name } -- a joining member
  // never receives the invite code. Callers only use `.id` (navigation).
  return data as Group;
}
// Fix 7 (audit M-1): the pre-join preview returns ONLY the group's name and
// description -- no owner name, no member count (migration 027 replaces the
// RPC). That information is visible after joining, not to anyone who types
// or guesses a code.
export async function previewGroupByCode(code: string): Promise<{ name: string; description: string | null } | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("preview_group_by_code", { p_code: code }).single();
  if (error || !data) return null;
  const d = data as any;
  // Tolerate the pre-027 shape while the migration is being rolled out.
  if (d.group_name) return { name: d.group_name, description: d.group_description ?? null };
  if (d.group_json) return { name: d.group_json.name, description: d.group_json.description ?? null };
  return null;
}
export async function leaveGroup(groupId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("leave_group", { p_group_id: groupId });
  if (error) throw error;
}
// Owner-only: soft-deletes the group for everyone (migration 028). The
// group disappears from all members' lists; its data stays recoverable in
// the database (deleted_at) rather than being destroyed outright.
export async function deleteGroup(groupId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_group", { p_group_id: groupId });
  if (error) throw error;
}
export async function removeMember(groupId: string, targetUserId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_group_member", { p_group_id: groupId, p_target_user_id: targetUserId });
  if (error) throw error;
}
export async function setMemberRole(groupId: string, targetUserId: string, role: "moderator" | "member", label?: string | null) {
  const supabase = createClient();
  // Migration 029's RPC also stores the owner's custom tag for the member
  // (CR, GR, anything). Until that migration has run, fall back to the
  // original role-only RPC so promoting keeps working.
  const { error } = await supabase.rpc("set_group_member_role_label", {
    p_group_id: groupId,
    p_target_user_id: targetUserId,
    p_new_role: role,
    p_label: label ?? null,
  });
  if (error) {
    const { error: fallbackError } = await supabase.rpc("set_group_member_role", { p_group_id: groupId, p_target_user_id: targetUserId, p_new_role: role });
    if (fallbackError) throw fallbackError;
  }
}
export async function regenerateInviteCode(groupId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("regenerate_invite_code", { p_group_id: groupId });
  if (error) throw error;
  return data as string;
}
const GROUP_COLUMNS = "id, owner_id, name, description, subject_id, semester_id, avatar_url, created_at, updated_at, deleted_at";
async function getGroup_online(groupId: string): Promise<Group | null> {
  const supabase = createClient();
  // Fix 7: invite_code is no longer directly readable (migration 027 column
  // grants). Owners/moderators fetch it separately via getGroupInviteCode().
  const { data } = await supabase.from("groups").select(GROUP_COLUMNS).eq("id", groupId).single();
  if (!data || (data as Group).deleted_at) return null; // soft-deleted (migration 028)
  return data as Group;
}
export async function getGroupInviteCode(groupId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_group_invite_code", { p_group_id: groupId });
  if (error) return "";
  return (data as string) ?? "";
}
// People in my groups -> their display names (see lib/groups/profiles.ts).
async function withNames<T extends Record<string, any>>(rows: T[], userKey: string) {
  const people = await getGroupmateProfiles().catch(() => ({}) as Record<string, { name: string | null; avatar: string | null }>);
  return rows.map((r) => ({ ...r, profiles: { full_name: people[r[userKey]]?.name ?? null, avatar_url: people[r[userKey]]?.avatar ?? null, email: null } }));
}
async function listGroupMembers_online(groupId: string): Promise<GroupMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (await withNames(data ?? [], "user_id")) as GroupMember[];
}
export async function shareItemToGroups(params: {
  groupIds: string[];
  sourceType: SharedSourceType;
  sourceId: string;
  snapshot: unknown;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const rows = params.groupIds.map((groupId) => ({
    id: crypto.randomUUID(),
    group_id: groupId,
    shared_by: user.id,
    source_type: params.sourceType,
    source_id: params.sourceId,
    snapshot: params.snapshot,
  }));
  const { error } = await supabase.from("group_shared_items").insert(rows);
  if (error) throw error;
}
async function listMySharesForItem_online(sourceType: SharedSourceType, sourceId: string): Promise<(GroupSharedItem & { group_name: string })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_shared_items")
    .select("*, groups(name)")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .is("deleted_at", null);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, group_name: row.groups?.name ?? "Group" }));
}
export async function unshareItem(itemId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("group_shared_items").update({ deleted_at: new Date().toISOString() }).eq("id", itemId);
  if (error) throw error;
}
async function listSharedItems_online(groupId: string, sourceType?: SharedSourceType): Promise<GroupSharedItem[]> {
  const supabase = createClient();
  let query = supabase
    .from("group_shared_items")
    .select("*")
    .eq("group_id", groupId)
    .is("deleted_at", null);
  if (sourceType) query = query.eq("source_type", sourceType);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (await withNames(data ?? [], "shared_by")) as GroupSharedItem[];
}
async function listAnnouncements_online(groupId: string): Promise<GroupAnnouncement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_announcements")
    .select("*")
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (await withNames(data ?? [], "posted_by")) as GroupAnnouncement[];
}
export async function postAnnouncement(groupId: string, message: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("group_announcements").insert({ id: crypto.randomUUID(), group_id: groupId, posted_by: user.id, message });
  if (error) throw error;
}
async function listComments_online(sharedItemId: string): Promise<GroupComment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_comments")
    .select("*")
    .eq("shared_item_id", sharedItemId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (await withNames(data ?? [], "user_id")) as GroupComment[];
}
export async function postComment(groupId: string, sharedItemId: string, message: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("group_comments").insert({ id: crypto.randomUUID(), group_id: groupId, shared_item_id: sharedItemId, user_id: user.id, message });
  if (error) throw error;
}
async function listMyNotifications_online(): Promise<GroupNotification[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("group_notifications").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as GroupNotification[];
}
export async function markNotificationRead(id: string) {
  const supabase = createClient();
  await supabase.from("group_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}
export interface RecentActivityItem {
  id: string;
  type: "shared_item" | "announcement";
  groupId: string;
  groupName: string;
  title: string;
  by: string;
  createdAt: string;
}
// Best-effort: relies on RLS to only return rows from groups the caller is
// a member of. Used by the dashboard's Recent Group Activity section;
// callers should swallow errors so a dashboard load never fails just
// because the user is offline.
async function listRecentGroupActivity_online(limit = 8): Promise<RecentActivityItem[]> {
  const supabase = createClient();
  const [sharedRes, annRes] = await Promise.all([
    supabase
      .from("group_shared_items")
      .select("id, group_id, snapshot, created_at, shared_by, groups(name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("group_announcements")
      .select("id, group_id, message, created_at, posted_by, groups(name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);
  const names: NameMap = await getGroupmateNames().catch(() => ({}) as NameMap);
  const shared: RecentActivityItem[] = (sharedRes.data ?? []).map((r: any) => ({
    id: r.id, type: "shared_item", groupId: r.group_id, groupName: r.groups?.name ?? "Group",
    title: r.snapshot?.title ?? "Shared content", by: names[r.shared_by] || "Someone",
    createdAt: r.created_at,
  }));
  const announcements: RecentActivityItem[] = (annRes.data ?? []).map((r: any) => ({
    id: r.id, type: "announcement", groupId: r.group_id, groupName: r.groups?.name ?? "Group",
    title: r.message, by: names[r.posted_by] || "Someone", createdAt: r.created_at,
  }));
  return [...shared, ...announcements].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}
export interface GroupSearchResult { kind: "group" | "shared"; id: string; title: string; subtitle: string; href: string; }
export async function searchMyGroupsContent(query: string): Promise<GroupSearchResult[]> {
  const supabase = createClient();
  const q = query.trim();
  if (q.length < 2) return [];
  const [groups, shared] = await Promise.all([
    supabase.from("groups").select("id, name").ilike("name", `%${q}%`).is("deleted_at", null).limit(5),
    supabase.from("group_shared_items").select("id, group_id, snapshot, groups(name)").is("deleted_at", null).limit(30),
  ]);
  const groupResults: GroupSearchResult[] = (groups.data ?? []).map((g) => ({ kind: "group", id: g.id, title: g.name, subtitle: "Group", href: `/groups/${g.id}` }));
  const sharedResults: GroupSearchResult[] = (shared.data ?? [])
    .filter((r: any) => ((r.snapshot?.title as string) ?? "").toLowerCase().includes(q.toLowerCase()))
    .map((r: any) => ({ kind: "shared", id: r.id, title: r.snapshot?.title ?? "Shared content", subtitle: r.groups?.name ?? "Group", href: `/groups/${r.group_id}` }));
  return [...groupResults, ...sharedResults].slice(0, 10);
}

// Offline-friendly read versions (see readCache.ts)
export const listMyGroups = withReadCache("listMyGroups", listMyGroups_online);
export const getGroup = withReadCache("getGroup", getGroup_online);
export const listGroupMembers = withReadCache("listGroupMembers", listGroupMembers_online);
export const listSharedItems = withReadCache("listSharedItems", listSharedItems_online);
export const listAnnouncements = withReadCache("listAnnouncements", listAnnouncements_online);
export const listComments = withReadCache("listComments", listComments_online);
export const listMyNotifications = withReadCache("listMyNotifications", listMyNotifications_online);
export const listRecentGroupActivity = withReadCache("listRecentGroupActivity", listRecentGroupActivity_online);
export const listMySharesForItem = withReadCache("listMySharesForItem", listMySharesForItem_online);
