import { createClient } from "@/lib/supabase/client";
import { withReadCache } from "@/lib/groups/readCache";

export interface GroupmateProfile {
  name: string | null; // null = this person has not set a proper name yet
  avatar: string | null;
}
export type NameMap = Record<string, string | null>;

// user id -> name + picture for everyone who shares a group with me (and me). Emails are never exposed.
async function getGroupmateProfiles_online(): Promise<Record<string, GroupmateProfile>> {
  const { data, error } = await createClient().rpc("get_groupmate_profiles");
  if (error) throw error;
  const out: Record<string, GroupmateProfile> = {};
  for (const row of (data ?? []) as { user_id: string; full_name: string | null; avatar_url?: string | null }[]) {
    out[row.user_id] = { name: row.full_name, avatar: row.avatar_url ?? null };
  }
  return out;
}
export const getGroupmateProfiles = withReadCache("getGroupmateProfiles", getGroupmateProfiles_online);

export async function getGroupmateNames(): Promise<NameMap> {
  const profiles = await getGroupmateProfiles();
  const out: NameMap = {};
  for (const [id, p] of Object.entries(profiles)) out[id] = p.name;
  return out;
}
