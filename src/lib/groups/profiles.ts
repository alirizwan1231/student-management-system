import { createClient } from "@/lib/supabase/client";
import { withReadCache } from "@/lib/groups/readCache";

// user id -> display name for everyone who shares a group with me (and me).
// null means that person has not set a proper name yet. Emails are never exposed.
async function getGroupmateNames_online(): Promise<Record<string, string | null>> {
  const { data, error } = await createClient().rpc("get_groupmate_profiles");
  if (error) throw error;
  const out: Record<string, string | null> = {};
  for (const row of (data ?? []) as { user_id: string; full_name: string | null }[]) out[row.user_id] = row.full_name;
  return out;
}
export const getGroupmateNames = withReadCache("getGroupmateNames", getGroupmateNames_online);

export type NameMap = Record<string, string | null>;
