import { z } from "zod";

export const featureFlagValueSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
});

export type FeatureFlagValue = z.infer<typeof featureFlagValueSchema>;
