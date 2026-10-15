"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listExams } from "@/lib/db/repo/exams";

export function useExams(userId: string | undefined) {
  return useLiveQuery(() => (userId ? listExams(userId) : []), [userId], []);
}
