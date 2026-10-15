import { db } from "@/lib/db";
import { newId, nowIso } from "@/lib/db/ids";
import { enqueueChange } from "@/lib/db/syncQueue";
import type { Semester } from "@/types/academic";

export interface CreateSemesterInput {
  name: string;
  number: number;
  start_date?: string | null;
  end_date?: string | null;
}

export async function createSemester(userId: string, input: CreateSemesterInput) {
  const now = nowIso();
  const semester: Semester = {
    id: newId(),
    user_id: userId,
    name: input.name,
    number: input.number,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    is_active: false,
    archived_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.semesters.add(semester);
  await enqueueChange("semesters", semester.id, "create", semester);
  return semester;
}

export async function updateSemester(id: string, changes: Partial<Semester>) {
  const updated_at = nowIso();
  await db.semesters.update(id, { ...changes, updated_at });
  const record = await db.semesters.get(id);
  if (record) await enqueueChange("semesters", id, "update", record);
  return record;
}

export async function deleteSemester(id: string) {
  // Soft delete -- keeps the row so the deletion can sync to other devices.
  const deleted_at = nowIso();
  await db.semesters.update(id, { deleted_at, updated_at: deleted_at });
  const record = await db.semesters.get(id);
  if (record) await enqueueChange("semesters", id, "delete", record);
}

export async function setActiveSemester(userId: string, semesterId: string) {
  const all = await db.semesters.where({ user_id: userId }).toArray();
  const updated_at = nowIso();
  await db.transaction("rw", db.semesters, async () => {
    for (const s of all) {
      if (s.is_active && s.id !== semesterId) {
        await db.semesters.update(s.id, { is_active: false, updated_at });
        await enqueueChange("semesters", s.id, "update", { ...s, is_active: false, updated_at });
      }
    }
    await db.semesters.update(semesterId, { is_active: true, updated_at });
  });
  const record = await db.semesters.get(semesterId);
  if (record) await enqueueChange("semesters", semesterId, "update", record);
  return record;
}

export function listSemesters(userId: string) {
  return db.semesters
    .where({ user_id: userId })
    .filter((s) => s.deleted_at === null)
    .sortBy("number");
}
