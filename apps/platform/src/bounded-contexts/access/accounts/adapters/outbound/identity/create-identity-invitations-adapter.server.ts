import { createClerkClient } from "@clerk/backend";
import type { IdentityInvitationsPort } from "~/bounded-contexts/access/accounts/domain/account";
import type { IdentityConfig } from "~/bounded-contexts/access/accounts/config.server";

import { ClerkIdentityInvitationsAdapter } from "./clerk-identity-invitations-adapter.server";
import type { IdentityInvitationUrls } from "./identity-invitation-urls.server";
import { InMemoryIdentityInvitationsAdapter } from "./in-memory-identity-invitations-adapter.server";

export function createIdentityInvitationsAdapter(
  config: IdentityConfig,
  urls: IdentityInvitationUrls,
): IdentityInvitationsPort {
  if (config.IDENTITY_PROVIDER === "memory") {
    return new InMemoryIdentityInvitationsAdapter({
      signUpUrl: urls.signUpUrl,
    });
  }

  return new ClerkIdentityInvitationsAdapter(
    createClerkClient({
      secretKey: config.CLERK_SECRET_KEY,
      apiUrl: config.CLERK_API_URL,
    }),
    urls,
  );
}
