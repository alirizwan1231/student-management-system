import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildR2Path } from "@/lib/r2/paths";
import { contentTypeForFileName, validateUpload } from "@/lib/r2/validation";
import { createPresignedPut } from "@/lib/r2/direct";

export const runtime = "nodejs";

// Step 1 of a direct upload: validate, then hand the browser a short-lived
// signed URL for exactly one object key under the user's own prefix.
// Fix 12 (audit M-6): the client's claimed contentType is IGNORED -- the
// stored type is derived from the file extension on the server. The size
// claim is only a pre-check; /api/storage/confirm re-verifies the real size
// (and type) from R2 after the upload.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { resourceId?: string; fileName?: string; size?: number; contentType?: string } | null;
  if (!body || typeof body.resourceId !== "string" || !body.resourceId || typeof body.fileName !== "string" || typeof body.size !== "number") {
    return NextResponse.json({ error: "Missing upload details" }, { status: 400 });
  }
  const invalid = validateUpload(body.fileName, body.size);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const contentType = contentTypeForFileName(body.fileName);
  if (!contentType) return NextResponse.json({ error: "File type is not allowed." }, { status: 400 });

  // If the resource row is already in Supabase, it must belong to the caller.
  // (Offline-first: a brand-new resource may not have synced yet. In that
  // case the user-namespaced path below is the protection -- the signed URL
  // can only ever write under users/<caller's id>/, never anyone else's.)
  const { data: existing } = await supabase
    .from("resources")
    .select("user_id")
    .eq("id", body.resourceId)
    .maybeSingle();
  if (existing && existing.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const storagePath = buildR2Path(user.id, body.resourceId, body.fileName);
  try {
    const url = await createPresignedPut(storagePath, contentType);
    return NextResponse.json({ url, storage_path: storagePath });
  } catch (error) {
    console.error("R2 presign failed:", error);
    return NextResponse.json({ error: "Could not prepare upload" }, { status: 500 });
  }
}
