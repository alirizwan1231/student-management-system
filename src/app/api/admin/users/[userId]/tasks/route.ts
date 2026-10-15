import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { fetchUserTasks } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const subjectId = new URL(request.url).searchParams.get("subjectId") ?? undefined;
  const data = await fetchUserTasks(params.userId, subjectId);
  return NextResponse.json({ tasks: data });
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
    .from("tasks")
    .insert({
      id,
      user_id: params.userId,
      subject_id: body.subject_id,
      title: body.title,
      task_type: body.task_type || "assignment",
      priority: body.priority || "medium",
      status: body.status || "pending",
      deadline: body.deadline || null,
      marks: body.marks || null,
      description: body.description || null,
    })
    .select()
    .single();
  if (error) {
    console.error("Admin task create error:", error);
    return NextResponse.json({ error: "Could not create task" }, { status: 500 });
  }
  await logAdminAction({ adminId: admin.userId, action: "task_create", targetUserId: params.userId, targetRecordId: id });
  return NextResponse.json({ task: data });
}
