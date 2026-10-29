import { createClerkClient } from "@clerk/backend";
import type { InvitationReferences } from "~/bounded-contexts/access/accounts/domain/account";
import type { IdentityConfig } from "~/bounded-contexts/access/accounts/config.server";

import { ClerkInvitationReferences } from "./clerk-invitation-references.server";
import { InMemoryInvitationReferences } from "./in-memory-invitation-references.server";

export function createInvitationReferences(
  config: IdentityConfig,
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
