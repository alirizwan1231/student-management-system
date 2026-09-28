"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listLecturesForSubject, getLecture } from "@/lib/db/repo/lectures";

export function useLectures(subjectId: string | undefined) {
  return useLiveQuery(
    () => (subjectId ? listLecturesForSubject(subjectId) : []),
    [subjectId],
    []
  );
}

export function useLecture(lectureId: string | undefined) {
  return useLiveQuery(() => (lectureId ? getLecture(lectureId) : undefined), [lectureId]);
}
