import { z } from "zod";

export const PushUpdateSchema = z.object({
  docId: z.string().length(10),
  // Limit to 500KB
  update: z.instanceof(Uint8Array).refine(arr => arr.byteLength <= 500_000, {
    message: "Update payload exceeds the 500KB limit",
  })
});

export const SaveVersionSchema = z.object({
  docId: z.string().length(10),
  label: z.string().max(100).optional().nullable()
});
