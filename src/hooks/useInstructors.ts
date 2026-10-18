"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getInstructorsOverview, getInstructorDetail } from "@/lib/db/repo/instructors";

export function useInstructorsOverview(userId: string | undefined) {
  return useLiveQuery(() => (userId ? getInstructorsOverview(userId) : []), [userId], []);
}

export function useInstructorDetail(userId: string | undefined, lecturerId: string | undefined) {
  return useLiveQuery(
    () => (userId && lecturerId ? getInstructorDetail(userId, lecturerId) : undefined),
    [userId, lecturerId]
  );
}
