"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listSemesters } from "@/lib/db/repo/semesters";

export function useSemesters(userId: string | undefined) {
  return useLiveQuery(() => (userId ? listSemesters(userId) : []), [userId], []);
}
