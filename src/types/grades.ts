import type { SyncMeta } from "@/types/academic";

export type GradeCategory = "assignment" | "quiz" | "midterm" | "final" | "project" | "lab" | "other";

export const GRADE_CATEGORIES: { value: GradeCategory; label: string }[] = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "midterm", label: "Midterm" },
  { value: "final", label: "Final" },
  { value: "project", label: "Project" },
  { value: "lab", label: "Lab" },
  { value: "other", label: "Other" },
];

export interface GradeEntry extends SyncMeta {
  subject_id: string;
  title: string;
  category: GradeCategory;
  score: number;
  max_score: number;
  weight: number | null; // percent of the final grade, optional
  graded_on: string | null; // yyyy-MM-dd
  notes: string | null;
}
