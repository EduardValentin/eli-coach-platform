import { createClerkClient } from "@clerk/backend";
import type { InvitationReferences } from "~/bounded-contexts/access/accounts/domain/account";

import { ClerkInvitationReferences } from "./clerk-invitation-references.server";
import { InMemoryInvitationReferences } from "./in-memory-invitation-references.server";

export type IdentityReadConfig = {
  CLERK_API_URL?: string;
  CLERK_SECRET_KEY: string;
  IDENTITY_PROVIDER: "clerk" | "memory";
};

export function createInvitationReferences(
  config: IdentityReadConfig,
): InvitationReferences {
  if (config.IDENTITY_PROVIDER === "memory") {
    return new InMemoryInvitationReferences();
  }

  return new ClerkInvitationReferences(
    createClerkClient({
      secretKey: config.CLERK_SECRET_KEY,
      apiUrl: config.CLERK_API_URL,
    }),
  );
}
