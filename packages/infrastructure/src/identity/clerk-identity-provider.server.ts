import { createClerkClient, type ClerkClient } from "@clerk/backend";

import type {
  IdentityAuthentication,
  IdentityConfig,
  IdentityProvider,
} from "./identity-contract.server";

type ClerkIdentityProviderOptions = {
  client?: ClerkClient;
  config: IdentityConfig;
};

export class ClerkIdentityProvider implements IdentityProvider {
  private readonly client: ClerkClient;
  private readonly config: IdentityConfig;

  constructor(options: ClerkIdentityProviderOptions) {
    this.config = options.config;
    this.client =
      options.client ??
      createClerkClient({
        apiUrl: options.config.apiUrl,
        publishableKey: options.config.publishableKey,
        secretKey: options.config.secretKey,
      });
  }

  async authenticate(request: Request): Promise<IdentityAuthentication> {
    const requestState = await this.client.authenticateRequest(request);
    const location = requestState.headers?.get("location");

    if (location) {
      return {
        status: "redirect",
        response: new Response(null, {
          headers: requestState.headers,
          status: 307,
        }),
      };
    }

    const auth = requestState.toAuth();

    if (!auth?.userId || !auth.sessionId) {
      return { status: "anonymous" };
    }

    return {
      status: "authenticated",
      identity: {
        email: readEmailClaim(auth.sessionClaims),
        sessionId: auth.sessionId,
        subjectId: auth.userId,
      },
    };
  }

  buildSignInUrl(returnUrl: string): string {
    const signInUrl = new URL("/sign-in", this.config.accountPortalUrl);

    signInUrl.searchParams.set("redirect_url", returnUrl);

    return signInUrl.toString();
  }

  async signOut(sessionId: string): Promise<void> {
    await this.client.sessions.revokeSession(sessionId);
  }
}

/**
 * Absent unless the instance is configured to add it: Clerk's default session
 * token carries no email.
 */
function readEmailClaim(claims: unknown): string | null {
  if (!claims || typeof claims !== "object") {
    return null;
  }

  const email = (claims as { email?: unknown }).email;

  return typeof email === "string" ? email : null;
}
