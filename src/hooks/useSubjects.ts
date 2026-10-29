"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listSubjectsForSemester, listAllSubjectsForUser, getSubject } from "@/lib/db/repo/subjects";

export function useSubjects(semesterId: string | undefined) {
  return useLiveQuery(
    () => (semesterId ? listSubjectsForSemester(semesterId) : []),
    [semesterId],
    []
  );
}

export function useAllSubjects(userId: string | undefined) {
  return useLiveQuery(() => (userId ? listAllSubjectsForUser(userId) : []), [userId], []);
}

export function useSubject(subjectId: string | undefined) {
  return useLiveQuery(() => (subjectId ? getSubject(subjectId) : undefined), [subjectId]);
}
