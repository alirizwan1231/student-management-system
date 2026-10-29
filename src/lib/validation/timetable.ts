import { z } from "zod";
export const timetableSlotSchema = z
  .object({
    subject_id: z.string().min(1, "Select a subject"),
    day_of_week: z.coerce.number().int().min(0).max(6),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    room: z.string().optional().nullable(),
    lecturer_id: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
  })
  // Fix 8 (audit M-2): mirrored by CHECK constraints in migration 027.
  .refine((d) => !d.start_time || !d.end_time || d.end_time > d.start_time, {
    message: "End time must be after the start time",
    path: ["end_time"],
  })
  .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
    message: "Ends-on date cannot be before the starts-from date",
    path: ["end_date"],
  });
export type TimetableSlotInput = z.infer<typeof timetableSlotSchema>;
