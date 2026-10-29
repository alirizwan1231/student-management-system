import { z } from "zod";

export const subjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().optional().nullable(),
  lecturer_name: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  credit_hours: z.coerce
    .number()
    .optional()
    .nullable()
    // Fix 8 (audit M-2): credit hours must be 1-30 when given (also a CHECK in migration 027).
    .refine((v) => v == null || (v >= 1 && v <= 30), { message: "Credit hours must be between 1 and 30" }),
  color: z.string().optional().nullable(),
  // Optional so forms with their own semester picker (Sidebar/Dashboard
  // "+ Add subject") keep this value through zodResolver's parse instead of
  // it being silently stripped.
  semester_id: z.string().optional(),
});

export type SubjectInput = z.infer<typeof subjectSchema>;
