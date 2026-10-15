import type { SyncMeta } from "@/types/academic";

export type ExamType = "midterm" | "final" | "quiz" | "viva" | "practical" | "other";

export const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: "midterm", label: "Midterm" },
  { value: "final", label: "Final" },
  { value: "quiz", label: "Quiz" },
  { value: "viva", label: "Viva" },
  { value: "practical", label: "Practical" },
  { value: "other", label: "Other" },
];

export interface Exam extends SyncMeta {
  subject_id: string;
  title: string;
  exam_type: ExamType;
  exam_date: string; // yyyy-MM-dd
  start_time: string | null; // HH:mm
  duration_minutes: number | null;
  room: string | null;
  notes: string | null;
}
