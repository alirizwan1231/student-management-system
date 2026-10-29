import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { fetchUserLectures } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const subjectId = new URL(request.url).searchParams.get("subjectId") ?? undefined;
  const data = await fetchUserLectures(params.userId, subjectId);
  return NextResponse.json({ lectures: data });
}
export async function POST(request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.subject_id) {
    return NextResponse.json({ error: "Title and subject are required" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("lectures")
    .insert({
      id,
      user_id: params.userId,
      subject_id: body.subject_id,
      lecture_number: body.lecture_number || null,
      title: body.title,
      lecture_date: body.lecture_date || null,
      short_summary: body.short_summary || null,
      detailed_notes: body.detailed_notes || null,
    })
    .select()
    .single();
  if (error) {
    console.error("Admin lecture create error:", error);
    return NextResponse.json({ error: "Could not create lecture" }, { status: 500 });
  }
  await logAdminAction({ adminId: admin.userId, action: "lecture_create", targetUserId: params.userId, targetRecordId: id });
  return NextResponse.json({ lecture: data });
}
