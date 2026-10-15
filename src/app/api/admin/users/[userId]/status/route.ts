import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const action = body?.action;
  if (action !== "disable" && action !== "restore") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (params.userId === admin.userId && action === "disable") {
    return NextResponse.json({ error: "You cannot disable your own account." }, { status: 400 });
  }
  const supabase = createAdminClient();
  try {
    // Real login block, via Supabase Auth's own ban mechanism -- not just a
    // cosmetic flag.
    await supabase.auth.admin.updateUserById(params.userId, {
      ban_duration: action === "disable" ? "876600h" : "none",
    });
  } catch (error) {
    console.error("Auth ban update error:", error);
    return NextResponse.json({ error: "Could not update account status" }, { status: 500 });
  }
  const { error } = await supabase
    .from("profiles")
    .update({ disabled_at: action === "disable" ? new Date().toISOString() : null })
    .eq("id", params.userId);
  if (error) {
    console.error("Profile status update error:", error);
    return NextResponse.json({ error: "Could not update account status" }, { status: 500 });
  }
  await logAdminAction({ adminId: admin.userId, action: `account_${action}`, targetUserId: params.userId });
  return NextResponse.json({ ok: true });
}
