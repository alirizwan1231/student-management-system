import { createClient as createSupabaseClient } from "@supabase/supabase-js";
// Service-role client: bypasses RLS entirely. NEVER import this from a
// client component ("use client") and never send its raw results to the
// browser -- every caller of this file lives in an API route that has
// already checked requireAdmin() first. This is the only place
// SUPABASE_SERVICE_ROLE_KEY is read.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Admin client is not configured: SUPABASE_SERVICE_ROLE_KEY is missing.");
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
