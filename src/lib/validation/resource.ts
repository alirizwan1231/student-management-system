import { z } from "zod";

export const resourceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  resource_type: z.enum(["pdf", "ppt", "doc", "image", "link", "other"]),
  url: z.string().url().optional().or(z.literal("")).nullable(),
});

export type ResourceInput = z.infer<typeof resourceSchema>;
