import { createClient } from "@/lib/supabase/client";
import { withReadCache } from "@/lib/groups/readCache";
import type { ClassPack, ClassPackPayload } from "@/lib/classpack/types";

async function getClassPack_online(groupId: string): Promise<ClassPack | null> {
  const { data, error } = await createClient().from("class_packs").select("*").eq("group_id", groupId).maybeSingle();
  if (error) throw error;
  return (data as ClassPack | null) ?? null;
}
// cached, so an opened pack can still be viewed offline
export const getClassPack = withReadCache("getClassPack", getClassPack_online);

export async function publishClassPack(groupId: string, title: string, payload: ClassPackPayload): Promise<number> {
  const { data, error } = await createClient().rpc("publish_class_pack", { p_group_id: groupId, p_title: title, p_payload: payload });
  if (error) throw error;
  return data as number;
}
