import { z } from "zod";

export const lecturerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});

export type LecturerInput = z.infer<typeof lecturerSchema>;
