import { z } from "zod";

export const lectureSchema = z.object({
  lecture_number: z.coerce.number().int().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  lecture_date: z.string().optional().nullable(),
  detailed_notes: z.string().optional().nullable(),
  short_summary: z.string().optional().nullable(),
  keywordsRaw: z.string().optional(), // comma-separated input, split before saving
  // Optional so forms with their own subject picker (Sidebar/Dashboard
  // "+ Add lecture") keep this value through zodResolver's parse instead of
  // it being silently stripped.
  subject_id: z.string().optional(),
});

export type LectureInput = z.infer<typeof lectureSchema>;

export function parseKeywords(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}
