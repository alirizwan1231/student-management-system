import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (role !== "student" && role !== "admin") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (params.userId === admin.userId && role !== "admin") {
    return NextResponse.json({ error: "You cannot remove your own admin role." }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data: before } = await supabase.from("profiles").select("role").eq("id", params.userId).single();
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const { error } = await supabase.from("profiles").update({ role }).eq("id", params.userId);
  if (error) {
    console.error("Role update error:", error);
    return NextResponse.json({ error: "Could not update role" }, { status: 500 });
  }
  await logAdminAction({
    adminId: admin.userId,
    action: "role_change",
    targetUserId: params.userId,
    metadata: { from: before.role, to: role },
  });
  return NextResponse.json({ ok: true, role });
}
