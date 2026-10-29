"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listResourcesForSubject, listResourcesForLecture, listResourcesForTask } from "@/lib/db/repo/resources";

export function useSubjectResources(subjectId: string | undefined) {
  return useLiveQuery(() => (subjectId ? listResourcesForSubject(subjectId) : []), [subjectId], []);
}

export function useLectureResources(lectureId: string | undefined) {
  return useLiveQuery(() => (lectureId ? listResourcesForLecture(lectureId) : []), [lectureId], []);
}

export function useTaskResources(taskId: string | undefined) {
  return useLiveQuery(() => (taskId ? listResourcesForTask(taskId) : []), [taskId], []);
}
