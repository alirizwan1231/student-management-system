import type { Lecture } from "@/types/academic";

export function padLectureNumber(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? "--" : String(n).padStart(2, "0");
}

export function lectureLabel(n: number | null | undefined): string {
  return n == null ? "Lecture" : `Lecture ${padLectureNumber(n)}`;
}

// Case-insensitive match over everything a student might remember.
export function noteMatchesQuery(lecture: Lecture, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    lecture.title,
    lecture.short_summary ?? "",
    lecture.detailed_notes ?? "",
    lecture.keywords.join(" "),
    lecture.lecture_number != null ? `lecture ${lecture.lecture_number}` : "",
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}
