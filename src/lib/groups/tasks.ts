import { createClient } from "@/lib/supabase/client";
import { withReadCache } from "@/lib/groups/readCache";
import type { GroupTask, GroupTaskCompletion, GroupTaskInput, TasksPolicy } from "@/types/groupTasks";
import type { GroupSharedItem, LectureSnapshot } from "@/types/groups";

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

// ---------- reads (cached so they open offline after one online visit) ----------
async function listGroupTasks_online(groupId: string): Promise<GroupTask[]> {
  const { data, error } = await createClient()
    .from("group_tasks")
    .select("*")
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .order("week_start", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as GroupTask[];
}
export const listGroupTasks = withReadCache("listGroupTasks", listGroupTasks_online);

async function listCompletions_online(groupId: string): Promise<GroupTaskCompletion[]> {
  const { data, error } = await createClient()
    .from("group_task_completions")
    .select("task_id, user_id, completed_at, group_tasks!inner(group_id)")
    .eq("group_tasks.group_id", groupId);
  if (error) throw error;
  return ((data ?? []) as GroupTaskCompletion[]).map((c) => ({ task_id: c.task_id, user_id: c.user_id, completed_at: c.completed_at }));
}
export const listCompletions = withReadCache("listCompletions", listCompletions_online);

async function getTaskProgress_online(groupId: string): Promise<Record<string, number>> {
  const { data, error } = await createClient().rpc("group_task_progress", { p_group_id: groupId });
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const row of (data ?? []) as { task_id: string; done_count: number }[]) out[row.task_id] = row.done_count;
  return out;
}
export const getTaskProgress = withReadCache("getTaskProgress", getTaskProgress_online);

async function getTasksPolicy_online(groupId: string): Promise<TasksPolicy> {
  const { data, error } = await createClient().from("groups").select("tasks_policy").eq("id", groupId).maybeSingle();
  if (error) throw error;
  return (data?.tasks_policy as TasksPolicy | undefined) ?? "everyone";
}
export const getTasksPolicy = withReadCache("getTasksPolicy", getTasksPolicy_online);

// Notes that were attached to a task ("this note is for this task").
async function listTaskNotes_online(groupId: string): Promise<GroupSharedItem[]> {
  const { data, error } = await createClient()
    .from("group_shared_items")
    .select("*")
    .eq("group_id", groupId)
    .eq("source_type", "lecture")
    .not("group_task_id", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GroupSharedItem[];
}
export const listTaskNotes = withReadCache("listTaskNotes", listTaskNotes_online);

// ---------- writes (need internet) ----------
export async function createGroupTask(groupId: string, input: GroupTaskInput) {
  const userId = await requireUserId();
  const id = crypto.randomUUID();
  const { error } = await createClient()
    .from("group_tasks")
    .insert({ id, group_id: groupId, created_by: userId, ...input, series_id: input.repeat_weekly ? id : null });
  if (error) throw error;
  return id;
}

export async function updateGroupTask(task: GroupTask, input: GroupTaskInput) {
  const series_id = input.repeat_weekly ? task.series_id ?? task.id : task.series_id;
  const { error } = await createClient()
    .from("group_tasks")
    .update({ ...input, series_id, updated_at: new Date().toISOString() })
    .eq("id", task.id);
  if (error) throw error;
}

export async function deleteGroupTask(id: string) {
  const now = new Date().toISOString();
  const { error } = await createClient().from("group_tasks").update({ deleted_at: now, updated_at: now }).eq("id", id);
  if (error) throw error;
}

export async function stopRepeating(id: string) {
  const { error } = await createClient().from("group_tasks").update({ repeat_weekly: false, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function setTaskDone(taskId: string, done: boolean) {
  const userId = await requireUserId();
  const supabase = createClient();
  if (done) {
    const { error } = await supabase.from("group_task_completions").upsert({ task_id: taskId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("group_task_completions").delete().eq("task_id", taskId).eq("user_id", userId);
    if (error) throw error;
  }
}

export async function rollWeeklyTasks(groupId: string, weekStart: string) {
  const { error } = await createClient().rpc("roll_group_weekly_tasks", { p_group_id: groupId, p_week_start: weekStart });
  if (error) throw error;
}

export async function setTasksPolicy(groupId: string, policy: TasksPolicy) {
  const { error } = await createClient().from("groups").update({ tasks_policy: policy }).eq("id", groupId);
  if (error) throw error;
}

export async function attachNoteToTask(params: { groupId: string; taskId: string; sourceId: string; snapshot: LectureSnapshot }) {
  const userId = await requireUserId();
  const { error } = await createClient().from("group_shared_items").insert({
    id: crypto.randomUUID(),
    group_id: params.groupId,
    shared_by: userId,
    source_type: "lecture",
    source_id: params.sourceId,
    snapshot: params.snapshot,
    group_task_id: params.taskId,
  });
  if (error) throw error;
}