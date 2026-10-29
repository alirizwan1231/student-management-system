import { createClient } from "@/lib/supabase/client";

export interface MyProfile {
  full_name: string | null;
  avatar_url: string | null;
}

export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  const { data } = await createClient().from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle();
  return (data as MyProfile | null) ?? null;
}

// dataUrl = null removes the picture
export async function saveMyAvatar(userId: string, dataUrl: string | null) {
  const { error } = await createClient().from("profiles").update({ avatar_url: dataUrl }).eq("id", userId);
  if (error) throw error;
}
