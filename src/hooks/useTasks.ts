"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listTasksForSubject, listAllTasks, getTask } from "@/lib/db/repo/tasks";

export function useSubjectTasks(subjectId: string | undefined) {
  return useLiveQuery(() => (subjectId ? listTasksForSubject(subjectId) : []), [subjectId], []);
}

export function useAllTasks(userId: string | undefined) {
  return useLiveQuery(() => (userId ? listAllTasks(userId) : []), [userId], []);
}

export function useTask(id: string | undefined) {
  return useLiveQuery(() => (id ? getTask(id) : undefined), [id]);
}
