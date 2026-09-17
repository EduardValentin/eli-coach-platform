import type { AccountRole } from "@eli-coach-platform/domain/accounts";
import { z } from "zod";

export const accountResponseSchema = z.object({
  role: z.enum(["CLIENT", "COACH"]),
});

// The public shell loader maps ResolvedSession (server/guards/session-context.server)
// into this role-only shape before it reaches the browser — the account id
// never needs to cross the wire for the nav to know what to show.
export type PublicSessionState =
  { kind: "anonymous" } | { kind: "authenticated"; role: AccountRole };
