import { createClerkClient } from "@clerk/backend";
import type { IdentityInvitations } from "~/bounded-contexts/clients/clients/domain/client-invitation";

import { ClerkIdentityInvitations } from "./clerk-identity-invitations.server";
import type { IdentityInvitationUrls } from "./identity-invitation-urls.server";
import { InMemoryIdentityInvitations } from "./in-memory-identity-invitations.server";

export type IdentityConfig = {
  CLERK_API_URL?: string;
  CLERK_SECRET_KEY: string;
  IDENTITY_PROVIDER: "clerk" | "memory";
};

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
