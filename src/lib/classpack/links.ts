import { getMeta, setMeta } from "@/lib/db/repo/meta";
import { packHash } from "@/lib/classpack/fingerprint";
import type { ClassPackPayload } from "@/lib/classpack/types";

// Remembers (on this device) which of MY items came from which pack item, and what they looked
// like at the time. This is what makes "update available" and safe updates possible.
export type LinkKind = "subject" | "note" | "task" | "exam";

export interface LinkedItem {
  kind: LinkKind;
  localId: string;
  packHash: string; // how the pack item looked when I imported it
  localFp: string; // how MY copy looked right after the import (to notice if I edit it later)
}
export interface PackLinks {
  version: number;
  items: Record<string, LinkedItem>;
}

const keyFor = (groupId: string) => `pack_links:${groupId}`;

export async function readLinks(groupId: string): Promise<PackLinks | null> {
  const raw = await getMeta(keyFor(groupId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PackLinks;
  } catch {
    return null;
  }
}

export async function writeLinks(groupId: string, links: PackLinks) {
  await setMeta(keyFor(groupId), JSON.stringify(links));
}

export type ItemStatus = "new" | "changed" | "same";
export interface PackDiff {
  status: Record<string, ItemStatus>;
  newCount: number;
  changedCount: number;
  removedCount: number; // imported notes/tasks/exams that are no longer in the pack at all
}

export function diffPack(payload: ClassPackPayload, links: PackLinks | null): PackDiff {
  const status: Record<string, ItemStatus> = {};
  let newCount = 0;
  let changedCount = 0;
  const present = new Set<string>();
  const check = (key: string, hash: string) => {
    present.add(key);
    const l = links?.items[key];
    const s: ItemStatus = !l ? "new" : l.packHash === hash ? "same" : "changed";
    status[key] = s;
    if (s === "new") newCount += 1;
    if (s === "changed") changedCount += 1;
  };
  for (const s of payload.subjects) {
    check(s.key, packHash.subject(s));
    for (const n of s.notes ?? []) check(n.key, packHash.note(n));
    for (const t of s.tasks ?? []) check(t.key, packHash.task(t));
    for (const e of s.exams ?? []) check(e.key, packHash.exam(e));
  }
  let removedCount = 0;
  for (const [key, l] of Object.entries(links?.items ?? {})) {
    if (l.kind !== "subject" && !present.has(key)) removedCount += 1;
  }
  return { status, newCount, changedCount, removedCount };
}
