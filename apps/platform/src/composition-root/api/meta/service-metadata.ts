import { z } from "zod";

export const appMetadataSchema = z.object({
  appName: z.string(),
  environment: z.string(),
  version: z.string(),
});

export type AppMetadata = z.infer<typeof appMetadataSchema>;
