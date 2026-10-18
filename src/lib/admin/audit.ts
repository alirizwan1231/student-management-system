import { createAdminClient } from "@/lib/supabase/admin";
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetUserId?: string | null;
  targetRecordId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  await supabase.from("admin_audit_log").insert({
    admin_id: params.adminId,
    action: params.action,
    target_user_id: params.targetUserId ?? null,
    target_record_id: params.targetRecordId ?? null,
    metadata: params.metadata ?? null,
  });
}
