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
    const requestState = await this.client.authenticateRequest(
      this.pinnedToPublicOrigin(request),
      this.config.publicAppUrl
        ? { authorizedParties: [new URL(this.config.publicAppUrl).origin] }
        : {},
    );
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
    const headers = requestState.headers ?? new Headers();

    if (!auth?.userId || !auth.sessionId) {
      return { headers, status: "anonymous" };
    }

    return {
      headers,
      status: "authenticated",
      identity: {
        sessionId: auth.sessionId,
        subjectId: auth.userId,
      },
    };
  }

  /**
   * Clerk builds the handshake return address from `X-Forwarded-Host`, so an
   * attacker-supplied value would send the visitor, and her new session, to that
   * host. A configured origin wins over anything a header claims.
   */
  private pinnedToPublicOrigin(request: Request): Request {
    if (!this.config.publicAppUrl) {
      return request;
    }

    const requestUrl = new URL(request.url);
    const pinned = new URL(this.config.publicAppUrl);

    requestUrl.protocol = pinned.protocol;
    requestUrl.host = pinned.host;

    const headers = new Headers(request.headers);

    headers.delete("x-forwarded-host");
    headers.delete("x-forwarded-proto");
    headers.set("host", pinned.host);

    return new Request(requestUrl, {
      body: request.body,
      // @ts-expect-error -- Node needs this to stream a body it did not create.
      duplex: "half",
      headers,
      method: request.method,
      redirect: request.redirect,
      signal: request.signal,
    });
  }

  buildSignInUrl(returnUrl: string): string {
    const signInUrl = new URL("/sign-in", this.config.accountPortalUrl);

    signInUrl.searchParams.set("redirect_url", returnUrl);

    return signInUrl.toString();
  }

  /**
   * Best effort: Clerk answers 404 once the user behind a session is gone, which
   * is the deleted-account path, and letting that escape would turn the caller's
   * intended redirect into a 500.
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
