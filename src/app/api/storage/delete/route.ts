import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteObject } from "@/lib/r2/storage";
import { isOwnedPath } from "@/lib/r2/paths";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const path = body?.path;
  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  if (!isOwnedPath(path, user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await deleteObject(path);
  } catch (error) {
    console.error("R2 delete failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
