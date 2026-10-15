"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listAttendance } from "@/lib/db/repo/attendance";

export function useAttendanceRecords(userId: string | undefined) {
  return useLiveQuery(() => (userId ? listAttendance(userId) : []), [userId], []);
}
