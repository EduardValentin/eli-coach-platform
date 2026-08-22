import { createClerkClient, type ClerkClient } from "@clerk/backend";

import type {
  IdentityAuthentication,
  IdentityConfig,
  IdentityProvider,
} from "./identity-contract.server";

type ClerkIdentityProviderOptions = {
  config: IdentityConfig;
};

export class ClerkIdentityProvider implements IdentityProvider {
  private readonly client: ClerkClient;
  private readonly config: IdentityConfig;

  constructor(options: ClerkIdentityProviderOptions) {
    this.config = options.config;
    this.client = createClerkClient({
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

  /**
   * Revocation is best effort, and deliberately so. Every caller revokes on its
   * way to somewhere else — a failure page, the Store — and has already decided
   * to refuse this visitor. Clerk answers 404 once the user behind a session is
   * gone, which is precisely the deleted-account path, so letting that escape
   * would turn the intended redirect into a 500 and leave her cookies in place.
   */
  async signOut(sessionId: string): Promise<void> {
    try {
      await this.client.sessions.revokeSession(sessionId);
    } catch {
      console.error("Clerk session revocation failed.", {
        errorCategory: "clerk_session_revocation_failure",
      });
    }
  }
}
