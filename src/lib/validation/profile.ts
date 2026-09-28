import { z } from "zod";

export const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
