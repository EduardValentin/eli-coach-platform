import { z } from "zod";

export const serviceMetadataSchema = z.object({
  appName: z.string(),
  environment: z.string(),
  service: z.string(),
  version: z.string(),
});

export type ServiceMetadata = z.infer<typeof serviceMetadataSchema>;
