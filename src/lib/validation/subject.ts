import { z } from "zod";

export const subjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional().nullable(),
  lecturer_name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  credit_hours: z.coerce.number().optional().nullable(),
  color: z.string().optional().nullable(),
  // Optional so forms with their own semester picker (Sidebar/Dashboard
  // "+ Add subject") keep this value through zodResolver's parse instead of
  // it being silently stripped.
  semester_id: z.string().optional(),
});

export type SubjectInput = z.infer<typeof subjectSchema>;
