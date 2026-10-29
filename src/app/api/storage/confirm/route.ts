import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnedPath } from "@/lib/r2/paths";
import { isAllowedContentType, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/r2/validation";
import { getObjectHead, removeObject } from "@/lib/r2/direct";

export const runtime = "nodejs";

// Step 2 of a direct upload: the browser cannot be trusted about file size
// or type, so we ask R2 what actually arrived and delete anything that
// breaks the rules (Fix 12, audit M-6).
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { path?: string } | null;
  if (!body?.path || !isOwnedPath(body.path, user.id)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const head = await getObjectHead(body.path);
  if (head === null) return NextResponse.json({ error: "Uploaded file was not found" }, { status: 404 });
  const { size, contentType } = head;
  if (size === 0 || size > MAX_FILE_SIZE_BYTES || !isAllowedContentType(contentType)) {
    await removeObject(body.path).catch(() => undefined);
    const error =
      size === 0
        ? "File is empty."
        : size > MAX_FILE_SIZE_BYTES
          ? `File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`
          : "File type is not allowed.";
    return NextResponse.json({ error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, size });
}
