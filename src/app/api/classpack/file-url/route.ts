import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedDownloadUrl } from "@/lib/r2/storage";

export const runtime = "nodejs";

// Any member of the group may open the pack's shared files, and nothing else:
// only paths under packs/<this group>/ are allowed.
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get("groupId");
  const path = searchParams.get("path");
  if (!groupId || !path || path.includes("..") || !path.startsWith(`packs/${groupId}/`)) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const { data: member } = await supabase.from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });

  try {
    return NextResponse.json({ url: await getSignedDownloadUrl(path) });
  } catch (error) {
    console.error("Class pack signed URL failed:", error);
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }
}
