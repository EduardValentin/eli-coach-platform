import { createClerkClient } from "@clerk/backend";
import type { IdentityConfig } from "@eli-coach-platform/config";
import type { IdentityInvitations } from "@eli-coach-platform/domain/client-invitation";

import { ClerkIdentityInvitations } from "./clerk-identity-invitations.server";
import type { IdentityInvitationUrls } from "./identity-invitation-urls.server";
import { InMemoryIdentityInvitations } from "./in-memory-identity-invitations.server";

export function createIdentityInvitations(
  config: IdentityConfig,
  urls: IdentityInvitationUrls,
): IdentityInvitations {
  if (config.IDENTITY_PROVIDER === "memory") {
    return new InMemoryIdentityInvitations({ signUpUrl: urls.signUpUrl });
  }

  return new ClerkIdentityInvitations(
    createClerkClient({
      secretKey: config.CLERK_SECRET_KEY,
      apiUrl: config.CLERK_API_URL,
    }),
    urls,
  );
}
