import { db } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { enqueueChange } from "@/lib/db/syncQueue";
import type { Resource, ResourceType } from "@/types/academic";

export interface CreateResourceInput {
  subject_id?: string | null;
  lecture_id?: string | null;
  task_id?: string | null;
  title: string;
  url?: string | null;
  resource_type: ResourceType;
}

export async function createResource(userId: string, input: CreateResourceInput) {
  const now = nowIso();
  const resource: Resource = {
    id: newId(),
    user_id: userId,
    subject_id: input.subject_id ?? null,
    lecture_id: input.lecture_id ?? null,
    task_id: input.task_id ?? null,
    title: input.title,
    url: input.url ?? null,
    storage_path: null,
    resource_type: input.resource_type,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.resources.add(resource);
  await enqueueChange("resources", resource.id, "create", resource);
  return resource;
}

export async function attachStoragePath(resourceId: string, storagePath: string) {
  const updated_at = nowIso();
  await db.resources.update(resourceId, { storage_path: storagePath, updated_at });
  const record = await db.resources.get(resourceId);
  if (record) await enqueueChange("resources", resourceId, "update", record);
  return record;
}

export async function deleteResource(id: string) {
  const deleted_at = nowIso();
  await db.resources.update(id, { deleted_at, updated_at: deleted_at });
  const record = await db.resources.get(id);
  if (record) await enqueueChange("resources", id, "delete", record);
}

export function listResourcesForSubject(subjectId: string) {
  return db.resources
    .where({ subject_id: subjectId })
    .filter((r) => r.deleted_at === null)
    .toArray();
}

export function listResourcesForLecture(lectureId: string) {
  return db.resources
    .where({ lecture_id: lectureId })
    .filter((r) => r.deleted_at === null)
    .toArray();
}

export function listResourcesForTask(taskId: string) {
  return db.resources
    .where({ task_id: taskId })
    .filter((r) => r.deleted_at === null)
    .toArray();
}
