import type { AccountRole } from "@eli-coach-platform/domain";
import { z } from "zod";

export const accountResponseSchema = z.object({
  role: z.enum(["USER", "CLIENT", "COACH"]),
});

export type AccountResponse = z.infer<typeof accountResponseSchema>;

export type PublicSessionState =
  | { kind: "anonymous" }
  | { kind: "authenticated"; role: AccountRole };
