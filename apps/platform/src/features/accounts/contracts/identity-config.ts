import { z } from "zod";

export const publicIdentityConfigSchema = z.object({
  publishableKey: z.string().min(1),
});

export type PublicIdentityConfig = z.infer<typeof publicIdentityConfigSchema>;
