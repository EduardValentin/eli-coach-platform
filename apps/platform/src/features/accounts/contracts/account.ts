import { z } from "zod";

export const accountResponseSchema = z.object({
  role: z.enum(["USER", "CLIENT", "COACH"]),
});

export type AccountResponse = z.infer<typeof accountResponseSchema>;
