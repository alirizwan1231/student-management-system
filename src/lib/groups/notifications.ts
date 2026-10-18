import { createClient } from "@/lib/supabase/client";
import type { GroupNotification } from "@/types/groups";

export interface NotificationRow extends GroupNotification {
  groups?: { name: string } | null;
}

// Rows are created by database triggers when something happens in one of your
// groups (new shared content, announcement, comment, group task). Row Level
// Security guarantees you only ever see your own.
export async function listNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await createClient()
    .from("group_notifications")
    .select("*, groups(name)")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function markNotificationRead(id: string) {
  await createClient().from("group_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
}

export async function markAllNotificationsRead() {
  await createClient().from("group_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
}
