import { z } from "zod";

export const healthStatusSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
