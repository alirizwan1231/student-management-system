import { db } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { enqueueChange } from "@/lib/db/syncQueue";
import type { AcademicTask, TaskStatus } from "@/types/academic";

export interface CreateTaskInput {
  subject_id: string;
  title: string;
  description?: string | null;
  task_type: AcademicTask["task_type"];
  deadline?: string | null;
  priority?: AcademicTask["priority"];
  marks?: number | null;
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const now = nowIso();
  const task: AcademicTask = {
    id: newId(),
    user_id: userId,
    subject_id: input.subject_id,
    title: input.title,
    description: input.description ?? null,
    task_type: input.task_type,
    deadline: input.deadline ?? null,
    status: "pending",
    priority: input.priority ?? "medium",
    marks: input.marks ?? null,
    storage_path: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.tasks.add(task);
  await enqueueChange("tasks", task.id, "create", task);
  return task;
}

export async function updateTask(id: string, changes: Partial<AcademicTask>) {
  const updated_at = nowIso();
  await db.tasks.update(id, { ...changes, updated_at });
  const record = await db.tasks.get(id);
  if (record) await enqueueChange("tasks", id, "update", record);
  return record;
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  return updateTask(id, { status });
}

export async function deleteTask(id: string) {
  const deleted_at = nowIso();
  await db.tasks.update(id, { deleted_at, updated_at: deleted_at });
  const record = await db.tasks.get(id);
  if (record) await enqueueChange("tasks", id, "delete", record);
}

export function listTasksForSubject(subjectId: string) {
  return db.tasks
    .where({ subject_id: subjectId })
    .filter((t) => t.deleted_at === null)
    .toArray();
}

export function listAllTasks(userId: string) {
  return db.tasks
    .where({ user_id: userId })
    .filter((t) => t.deleted_at === null)
    .toArray();
}

// A task is overdue if it has a deadline in the past and isn't completed.
// This is computed on read rather than stored, so it's always correct
// without a background job re-flagging rows.
export function isOverdue(task: AcademicTask): boolean {
  if (!task.deadline || task.status === "completed") return false;
  return new Date(task.deadline).getTime() < Date.now();
}
