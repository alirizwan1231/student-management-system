import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getObjectBuffer, putObject } from "@/lib/r2/storage";
import { buildR2Path } from "@/lib/r2/paths";
export const runtime = "nodejs";
export async function POST(_request: Request, { params }: { params: { itemId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: item } = await supabase.from("group_shared_items").select("*").eq("id", params.itemId).is("deleted_at", null).single();
  if (!item) return NextResponse.json({ error: "Not found or not accessible" }, { status: 404 });
  const snapshot = item.snapshot as any;
  if (!snapshot?.storage_path) return NextResponse.json({ error: "File not available" }, { status: 404 });
  try {
    const { buffer, contentType } = await getObjectBuffer(snapshot.storage_path);
    const newResourceId = crypto.randomUUID();
    const newPath = buildR2Path(user.id, newResourceId, snapshot.title || "file");
    await putObject(newPath, buffer, contentType);
    return NextResponse.json({ resourceId: newResourceId, storagePath: newPath });
  } catch (error) {
    console.error("Group resource copy error:", error);
    return NextResponse.json({ error: "Could not copy file" }, { status: 500 });
  }
}
