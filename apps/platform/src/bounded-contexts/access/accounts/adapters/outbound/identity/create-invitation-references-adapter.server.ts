import { createClerkClient } from "@clerk/backend";
import type { InvitationReferencesPort } from "~/bounded-contexts/access/accounts/domain/account";
import type { IdentityConfig } from "~/bounded-contexts/access/accounts/config.server";

import { ClerkInvitationReferencesAdapter } from "./clerk-invitation-references-adapter.server";
import { InMemoryInvitationReferencesAdapter } from "./in-memory-invitation-references-adapter.server";

export function createInvitationReferencesAdapter(
  config: IdentityConfig,
): InvitationReferencesPort {
  if (config.IDENTITY_PROVIDER === "memory") {
    return new InMemoryInvitationReferencesAdapter();
  }

  return new ClerkInvitationReferencesAdapter(
    createClerkClient({
      secretKey: config.CLERK_SECRET_KEY,
      apiUrl: config.CLERK_API_URL,
    }),
  );
}
