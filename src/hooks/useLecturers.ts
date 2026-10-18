"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listAllLecturersForUser, getLecturer } from "@/lib/db/repo/lecturers";

export function useAllLecturers(userId: string | undefined) {
  return useLiveQuery(() => (userId ? listAllLecturersForUser(userId) : []), [userId], []);
}

export function useLecturer(id: string | undefined) {
  return useLiveQuery(() => (id ? getLecturer(id) : undefined), [id]);
}
