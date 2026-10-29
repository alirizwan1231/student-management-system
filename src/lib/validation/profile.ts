import { z } from "zod";

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Please enter your name")
    .max(60, "Name is too long")
    .refine((v) => !v.includes("@"), "Enter your name, not your email"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
