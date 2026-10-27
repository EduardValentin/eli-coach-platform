export type { AccountRole } from "~/bounded-contexts/access/accounts/domain/account";

import { z } from "zod";

export const accountResponseSchema = z.object({
  role: z.enum(["CLIENT", "COACH"]),
});

export type PortalDestination = {
  href: string;
  label: string;
};

export type PublicSessionState =
  | { kind: "anonymous" }
  | { kind: "authenticated"; portalDestination: PortalDestination };
