import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
const ALLOWED_TABLES = new Set(["semesters", "subjects", "lectures", "tasks"]);
// Whitelist of columns each table may be updated through -- never lets the
// client write user_id, id, or any column outside this list.
const UPDATABLE_FIELDS: Record<string, string[]> = {
  semesters: ["name", "number", "start_date", "end_date"],
  subjects: ["name", "code", "lecturer_name", "credit_hours", "semester_id"],
  lectures: ["title", "lecture_number", "lecture_date", "short_summary", "detailed_notes", "subject_id"],
  tasks: ["title", "task_type", "priority", "status", "deadline", "marks", "description", "subject_id"],
};
export async function PATCH(request: Request, { params }: { params: { table: string; recordId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!ALLOWED_TABLES.has(params.table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const allowedFields = UPDATABLE_FIELDS[params.table];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key] === "" ? null : body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();
  const supabase = createAdminClient();
  const { data: record } = await supabase.from(params.table).select("id, user_id").eq("id", params.recordId).single();
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  const { data, error } = await supabase.from(params.table).update(updates).eq("id", params.recordId).select().single();
  if (error) {
    console.error("Admin record update error:", error);
    return NextResponse.json({ error: "Could not update record" }, { status: 500 });
  }
await logAdminAction({
    adminId: admin.userId,
    action: `${params.table}_update`,
    targetUserId: record.user_id,
    targetRecordId: record.id,
    metadata: { fields: Object.keys(updates) },
  });
  return NextResponse.json({ record: data });
}
export async function DELETE(_request: Request, { params }: { params: { table: string; recordId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!ALLOWED_TABLES.has(params.table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data: record } = await supabase.from(params.table).select("id, user_id").eq("id", params.recordId).single();
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  const { error } = await supabase.from(params.table).update({ deleted_at: new Date().toISOString() }).eq("id", params.recordId);
  if (error) {
    console.error("Admin record delete error:", error);
    return NextResponse.json({ error: "Could not delete record" }, { status: 500 });
  }
  await logAdminAction({ adminId: admin.userId, action: `${params.table}_delete`, targetUserId: record.user_id, targetRecordId: record.id });
  return NextResponse.json({ ok: true });
}
