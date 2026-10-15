import { createClient } from "@/lib/supabase/server";
export interface AdminContext {
  userId: string;
  email: string | null;
}
// Server-side authorization: reads the CALLER's OWN profile row through the
// normal RLS-respecting client (their own row is always readable under
// "profiles_own"). The role value therefore always comes fresh from the
// database, never from anything the client could have sent -- a browser
// can never spoof "role: admin".
export async function requireAdmin(): Promise<AdminContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, disabled_at")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin" || profile.disabled_at) return null;
  return { userId: user.id, email: user.email ?? null };
}
