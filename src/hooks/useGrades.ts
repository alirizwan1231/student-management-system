"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listGrades } from "@/lib/db/repo/grades";

export function useGrades(userId: string | undefined) {
  return useLiveQuery(() => (userId ? listGrades(userId) : []), [userId], []);
}
