import { z } from "zod";

export const semesterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  number: z.coerce.number().int().min(1, "Must be at least 1"),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
});

export type SemesterInput = z.infer<typeof semesterSchema>;
