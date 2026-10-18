import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { fetchUserSemesters } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
export async function GET(_request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await fetchUserSemesters(params.userId);
  return NextResponse.json({ semesters: data });
}
export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.number) {
    return NextResponse.json({ error: "Name and number are required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("semesters")
    .insert({
      id,
      user_id: params.userId,
      name: body.name,
      number: body.number,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
    })
    .select()
    .single();
  if (error) {
    console.error("Admin semester create error:", error);
    return NextResponse.json({ error: "Could not create semester" }, { status: 500 });
  }
  await logAdminAction({ adminId: admin.userId, action: "semester_create", targetUserId: params.userId, targetRecordId: id });
  return NextResponse.json({ semester: data });
}
