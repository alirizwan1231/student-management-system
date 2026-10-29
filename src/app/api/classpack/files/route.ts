import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnedPath, sanitizeFileName } from "@/lib/r2/paths";
import { copyObject, getObjectSize } from "@/lib/r2/direct";

export const runtime = "nodejs";

// Publisher only: gives a class pack its own copy of each shared file, so it keeps working even
// if the publisher later deletes their own copy. The copy has a fixed name per source file, so
// publishing again overwrites it instead of piling up duplicates.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { groupId?: string; files?: { sourcePath: string; name?: string }[] } | null;
  if (!body?.groupId || !Array.isArray(body.files) || body.files.length === 0 || body.files.length > 60) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: member } = await supabase.from("group_members").select("role").eq("group_id", body.groupId).eq("user_id", user.id).maybeSingle();
  if (!member || !["owner", "moderator"].includes(member.role as string)) {
    return NextResponse.json({ error: "Only the owner or moderators can publish a class pack" }, { status: 403 });
  }

  const results: { sourcePath: string; packPath?: string; error?: string }[] = [];
  for (const file of body.files) {
    if (typeof file.sourcePath !== "string" || !isOwnedPath(file.sourcePath, user.id) || file.sourcePath.includes("..")) {
      results.push({ sourcePath: String(file.sourcePath), error: "Not your file" });
      continue;
    }
    try {
      if ((await getObjectSize(file.sourcePath)) === null) {
        results.push({ sourcePath: file.sourcePath, error: "File not found" });
        continue;
      }
      const name = sanitizeFileName(file.name || file.sourcePath.split("/").pop() || "file");
      const id = createHash("sha1").update(file.sourcePath).digest("hex").slice(0, 16);
      const dest = `packs/${body.groupId}/${id}/${name}`;
      await copyObject(file.sourcePath, dest);
      results.push({ sourcePath: file.sourcePath, packPath: dest });
    } catch (error) {
      console.error("Class pack file copy failed:", error);
      results.push({ sourcePath: file.sourcePath, error: "Copy failed" });
    }
  }
  return NextResponse.json({ files: results });
}
