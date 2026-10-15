import { z } from "zod";

// Notes belong to (subject, lecture number). `subject_id` is REQUIRED here:
// the old flow silently skipped saving when it was missing.
export const notesSchema = z.object({
  subject_id: z.string().min(1, "Select a subject"),
  lecture_number: z.coerce
    .number({ invalid_type_error: "Enter a lecture number" })
    .int("Use a whole number")
    .min(1, "Lecture numbers start at 1")
    .max(999, "That number looks too large"),
  title: z.string().trim().min(1, "Give these notes a title"),
  // Optional metadata only -- notes are not a schedule.
  lecture_date: z.string().optional().nullable(),
  detailed_notes: z.string().optional().nullable(),
  short_summary: z.string().optional().nullable(),
});

export type NotesInput = z.infer<typeof notesSchema>;
