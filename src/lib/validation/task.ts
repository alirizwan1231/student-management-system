import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  task_type: z.enum(["assignment", "lab", "quiz", "presentation", "project", "other"]),
  deadline: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  marks: z.coerce.number().optional().nullable(),
  // Optional so forms with their own subject picker (Sidebar/Dashboard
  // "+ Add task") keep this value through zodResolver's parse instead of
  // it being silently stripped -- a plain z.object() drops any key it
  // doesn't declare.
  subject_id: z.string().optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;
