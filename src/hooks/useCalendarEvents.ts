"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getCalendarEvents } from "@/lib/db/repo/calendar";

export function useCalendarEvents(userId: string | undefined) {
  return useLiveQuery(() => (userId ? getCalendarEvents(userId) : []), [userId], []);
}
