import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { deleteObject } from "@/lib/r2/storage";
// Admin download link for any user's resource -- short-lived signed URL,
// never a permanent public link and never raw R2 credentials.
export async function GET(_request: Request, { params }: { params: { resourceId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = createAdminClient();
  const { data: resource } = await supabase.from("resources").select("*").eq("id", params.resourceId).single();
  if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  if (!resource.storage_path) return NextResponse.json({ error: "File not uploaded yet" }, { status: 404 });
  try {
    const { getSignedDownloadUrl } = await import("@/lib/r2/storage");
    const url = await getSignedDownloadUrl(resource.storage_path);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Admin resource download error:", error);
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }
}
export async function DELETE(_request: Request, { params }: { params: { resourceId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = createAdminClient();
  const { data: resource } = await supabase.from("resources").select("*").eq("id", params.resourceId).single();
  if (!resource) return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  const { error } = await supabase
    .from("resources")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.resourceId);
  if (error) {
    console.error("Admin resource delete error:", error);
    return NextResponse.json({ error: "Could not delete resource" }, { status: 500 });
  }
  if (resource.storage_path) {
    try {
      await deleteObject(resource.storage_path);
    } catch (err) {
      console.warn("R2 cleanup failed for admin-deleted resource:", err);
    }
  }
  await logAdminAction({
    adminId: admin.userId,
    action: "resource_delete",
    targetUserId: resource.user_id,
    targetRecordId: resource.id,
    metadata: { title: resource.title },
  });
  return NextResponse.json({ ok: true });
}
