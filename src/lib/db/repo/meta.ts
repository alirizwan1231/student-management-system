import { db } from "@/lib/db";

export async function getMeta(key: string): Promise<string | null> {
  const row = await db.meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}

export function lastSyncedKey(table: string) {
  return `last_synced_at:${table}`;
}
