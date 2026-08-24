export type IdentityConfig = {
  accountPortalUrl: string;
  apiUrl?: string;
  /** The origin this application is actually served on, if it is known. */
  publicAppUrl?: string;
  publishableKey: string;
  secretKey: string;
};

export type VerifiedIdentity = {
  sessionId: string;
  subjectId: string;
};

/**
 * Two arms are easy to miss, and both leave the visitor signed out for reasons
 * nothing reports.
 *
 * The `redirect` arm: Clerk answers some requests with a redirect it needs the
 * browser to follow — the handshake that renews an expired session token, and,
 * on a development instance, the dev-browser sync. A caller that builds its own
 * response instead of returning this one breaks sign-in.
 *
 * `headers`: Clerk also asks for cookies to be *set* on an ordinary response —
 * a token it refreshed, and the whole session a handshake just established. On
 * a **production** instance the handshake resolves this way rather than through
 * a redirect, so a caller that drops these never signs anyone in at all. They
 * must be applied to whatever response the caller finally returns.
 */
export type IdentityAuthentication =
  | { status: "authenticated"; headers: Headers; identity: VerifiedIdentity }
  | { status: "anonymous"; headers: Headers }
  | { status: "redirect"; response: Response };

/**
 * `Headers.forEach` folds repeated `Set-Cookie` entries into one comma-joined
 * value, which browsers do not split back apart, so those are copied separately.
 */
export function applyIdentityHeaders(response: Response, headers: Headers): void {
  for (const cookie of headers.getSetCookie()) {
    response.headers.append("Set-Cookie", cookie);
  }

  headers.forEach((value, name) => {
    if (name.toLowerCase() !== "set-cookie") {
      response.headers.set(name, value);
    }
  });
}

export interface IdentityProvider {
  authenticate(request: Request): Promise<IdentityAuthentication>;
  buildSignInUrl(returnUrl: string): string;
  signOut(sessionId: string): Promise<void>;
}

/**
 * Only the events the application acts on are named. Anything else Clerk sends
 * is `ignored` rather than an error: a subscription widened in the dashboard
 * must not start failing deliveries here.
 */
export type IdentityWebhook =
  | { status: "identity-deleted"; subjectId: string }
  | { status: "ignored" }
  | { status: "unverified" };

export interface IdentityWebhookVerifier {
  verify(request: Request): Promise<IdentityWebhook>;
}
