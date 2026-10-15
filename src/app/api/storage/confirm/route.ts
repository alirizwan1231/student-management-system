import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnedPath } from "@/lib/r2/paths";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/r2/validation";
import { getObjectSize, removeObject } from "@/lib/r2/direct";

export const runtime = "nodejs";

// Step 2 of a direct upload: the browser cannot be trusted about file size,
// so we ask R2 what actually arrived and delete anything over the limit.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { path?: string } | null;
  if (!body?.path || !isOwnedPath(body.path, user.id)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const size = await getObjectSize(body.path);
  if (size === null) return NextResponse.json({ error: "Uploaded file was not found" }, { status: 404 });
  if (size === 0 || size > MAX_FILE_SIZE_BYTES) {
    await removeObject(body.path).catch(() => undefined);
    return NextResponse.json({ error: size === 0 ? "File is empty." : `File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.` }, { status: 400 });
  }
  return NextResponse.json({ ok: true, size });
}
