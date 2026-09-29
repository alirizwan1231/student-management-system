"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getFileCountsByLecture, getNotesOverview, getRecentNotes } from "@/lib/db/repo/notes";

export function useNotesOverview(userId: string | undefined) {
  return useLiveQuery(() => (userId ? getNotesOverview(userId) : undefined), [userId]);
}

export function useRecentNotes(userId: string | undefined, limit = 5) {
  return useLiveQuery(() => (userId ? getRecentNotes(userId, limit) : undefined), [userId, limit]);
}

export function useLectureFileCounts(userId: string | undefined) {
  return useLiveQuery(() => (userId ? getFileCountsByLecture(userId) : {}), [userId], {} as Record<string, number>);
}

// undefined = still loading, null = does not exist (or was deleted).
export function useLectureOrNull(id: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!id) return null;
      const lecture = await db.lectures.get(id);
      return lecture && lecture.deleted_at === null ? lecture : null;
    },
    [id]
  );
}
