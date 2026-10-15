import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildR2Path } from "@/lib/r2/paths";
import { validateUpload } from "@/lib/r2/validation";
import { createPresignedPut } from "@/lib/r2/direct";

export const runtime = "nodejs";

// Step 1 of a direct upload: validate, then hand the browser a short-lived
// signed URL for exactly one object key under the user's own prefix.
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

  const storagePath = buildR2Path(user.id, body.resourceId, body.fileName);
  try {
    const url = await createPresignedPut(storagePath, body.contentType || "application/octet-stream");
    return NextResponse.json({ url, storage_path: storagePath });
  } catch (error) {
    console.error("R2 presign failed:", error);
    return NextResponse.json({ error: "Could not prepare upload" }, { status: 500 });
  }
}
