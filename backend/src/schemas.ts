import { z } from "zod";

export const PushUpdateSchema = z.object({
  docId: z.string().length(10),
  update: z.any()
});

export const SaveVersionSchema = z.object({
  docId: z.string().length(10),
  label: z.string().max(100).optional().nullable()
});
