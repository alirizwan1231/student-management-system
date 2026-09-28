// Browser-side Supabase client (uses the public anon key).
// IMPORTANT: in this architecture, this client is used for authentication
// and by the sync engine (src/lib/sync/) only. Components should never call
// this directly to read/write academic data — read/write Dexie instead
// (src/lib/db/) so the UI keeps working offline.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
