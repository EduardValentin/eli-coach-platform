import { z } from "zod";

export const accountRoleSchema = z.enum(["USER", "CLIENT", "COACH"]);

export const publicSessionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("anonymous") }),
  z.object({ status: z.literal("authenticated"), role: accountRoleSchema }),
]);

export type AccountRoleName = z.infer<typeof accountRoleSchema>;
export type PublicSession = z.infer<typeof publicSessionSchema>;
