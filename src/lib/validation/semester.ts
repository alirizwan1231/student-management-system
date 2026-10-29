import { z } from "zod";

export const semesterSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    number: z.coerce.number().int().min(1, "Must be at least 1"),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
  })
  // Fix 8 (audit M-2): a semester cannot end before it starts. The same rule
  // exists in Postgres (migration 027 CHECK constraint) because the browser
  // writes directly to Supabase and client validation alone is bypassable.
  .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
    message: "End date cannot be before the start date",
    path: ["end_date"],
  });

export type SemesterInput = z.infer<typeof semesterSchema>;
