import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { fetchUserSubjects } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const semesterId = new URL(request.url).searchParams.get("semesterId") ?? undefined;
  const data = await fetchUserSubjects(params.userId, semesterId);
  return NextResponse.json({ subjects: data });
}
export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.semester_id) {
    return NextResponse.json({ error: "Name and semester are required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      id,
      user_id: params.userId,
      semester_id: body.semester_id,
      name: body.name,
      code: body.code || null,
      lecturer_name: body.lecturer_name || null,
      credit_hours: body.credit_hours || null,
      color: "#3366ff",
    })
    .select()
    .single();
if (error) {
    console.error("Admin subject create error:", error);
    return NextResponse.json({ error: "Could not create subject" }, { status: 500 });
  }
  await logAdminAction({ adminId: admin.userId, action: "subject_create", targetUserId: params.userId, targetRecordId: id });
  return NextResponse.json({ subject: data });
}
