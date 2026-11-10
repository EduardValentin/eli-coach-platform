import { createClerkClient } from "@clerk/backend";
import type { ApiKeyVerifierPort } from "~/bounded-contexts/access/accounts/domain/account";
import type { IdentityConfig } from "~/bounded-contexts/access/accounts/config.server";

import { ClerkApiKeyVerifierAdapter } from "./clerk-api-key-verifier-adapter.server";
import { InMemoryApiKeyVerifierAdapter } from "./in-memory-api-key-verifier-adapter.server";

export function createApiKeyVerifierAdapter(
  config: IdentityConfig,
): ApiKeyVerifierPort {
  if (config.IDENTITY_PROVIDER === "memory") {
    return new InMemoryApiKeyVerifierAdapter();
  }

  return new ClerkApiKeyVerifierAdapter(
    createClerkClient({
      secretKey: config.CLERK_SECRET_KEY,
      apiUrl: config.CLERK_API_URL,
    }),
  );
}
