import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { putObject } from "@/lib/r2/storage";
import { buildR2Path } from "@/lib/r2/paths";
import { validateUpload } from "@/lib/r2/validation";
export const runtime = "nodejs"; // the AWS SDK needs the Node runtime, not edge
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const formData = await request.formData();
  const file = formData.get("file");
  const resourceId = formData.get("resourceId");
  if (!(file instanceof File) || typeof resourceId !== "string" || !resourceId) {
    return NextResponse.json({ error: "Missing file or resourceId" }, { status: 400 });
  }
  const validationError = validateUpload(file.name, file.size);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  // Ownership of the resource row itself is enforced by Supabase RLS on the
  // `resources` table; here we only need the id to build a per-user,
  // per-resource path so this user's own uploads never collide with
  // anyone else's.
  const storagePath = buildR2Path(user.id, resourceId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await putObject(storagePath, buffer, file.type || "application/octet-stream");
  } catch (error) {
    console.error("R2 upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
  return NextResponse.json({ storage_path: storagePath });
}
