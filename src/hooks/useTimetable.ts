"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { listTimetableSlots, listTimetableExceptions } from "@/lib/db/repo/timetable";
export function useTimetableSlots(userId: string | undefined) {
  return useLiveQuery(() => (userId ? listTimetableSlots(userId) : []), [userId], []);
}
export function useTimetableExceptions(userId: string | undefined) {
  return useLiveQuery(() => (userId ? listTimetableExceptions(userId) : []), [userId], []);
}
