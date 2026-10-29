import { useSyncExternalStore } from "react";

// Live upload percentages (0..1) per pending-upload id. Kept in memory: it changes many times a
// second while a file uploads, which is too often to write to the database.
let snapshot: Record<string, number> = {};
const EMPTY: Record<string, number> = {};
const listeners = new Set<() => void>();

export function setUploadProgress(id: string, fraction: number | null) {
  const next = { ...snapshot };
  if (fraction === null) delete next[id];
  else next[id] = Math.max(0, Math.min(1, fraction));
  snapshot = next;
  listeners.forEach((l) => l());
}

export function useUploadProgress(): Record<string, number> {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => snapshot,
    () => EMPTY
  );
}
