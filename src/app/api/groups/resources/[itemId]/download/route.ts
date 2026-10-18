import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedDownloadUrl } from "@/lib/r2/storage";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: { itemId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  // RLS on group_shared_items (select policy: is_group_member(group_id))
  // means this query silently returns nothing if the caller isn't a
  // member -- that IS the membership + sharing check, enforced by the
  // database itself.
  const { data: item } = await supabase.from("group_shared_items").select("*").eq("id", params.itemId).is("deleted_at", null).single();
  if (!item) return NextResponse.json({ error: "Not found or not accessible" }, { status: 404 });
  const storagePath = (item.snapshot as any)?.storage_path;
  if (!storagePath) return NextResponse.json({ error: "File not available" }, { status: 404 });
  try {
    const url = await getSignedDownloadUrl(storagePath);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Group resource download error:", error);
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }
}
