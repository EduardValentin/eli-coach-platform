import { z } from "zod";

export const featureFlagContextSchema = z.object({
  userId: z.string().min(1).optional(),
});

export const featureFlagSnapshotSchema = z.object({
  flags: z.record(z.string(), z.boolean()),
});

export type FeatureFlagContext = z.infer<typeof featureFlagContextSchema>;
export type FeatureFlagSnapshot = z.infer<typeof featureFlagSnapshotSchema>;
