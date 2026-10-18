import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedDownloadUrl } from "@/lib/r2/storage";
import { isOwnedPath } from "@/lib/r2/paths";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  // The point of user-scoped paths: reject anything outside
  // users/{this user's id}/... even if the path string itself looks valid.
  if (!isOwnedPath(path, user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const url = await getSignedDownloadUrl(path);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("R2 signed URL failed:", error);
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }
}
