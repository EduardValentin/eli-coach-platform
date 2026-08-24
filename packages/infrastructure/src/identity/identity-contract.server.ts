export type IdentityConfig = {
  accountPortalUrl: string;
  apiUrl?: string;
  publicAppUrl?: string;
  publishableKey: string;
  secretKey: string;
};

export type VerifiedIdentity = {
  sessionId: string;
  subjectId: string;
};

/**
 * Both `redirect` and `headers` are load-bearing and silently break sign-in if
 * ignored. Clerk needs the browser to follow its redirect (session handshake,
 * dev-browser sync), and needs its cookies set on ordinary responses — on a
 * production instance the handshake resolves that way rather than by redirect.
 */
export type IdentityAuthentication =
  | { status: "authenticated"; headers: Headers; identity: VerifiedIdentity }
  | { status: "anonymous"; headers: Headers }
  | { status: "redirect"; response: Response };

/**
 * `Headers.forEach` folds repeated `Set-Cookie` into one comma-joined value that
 * browsers do not split apart, so those are copied separately.
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

export type IdentityWebhook =
  | { status: "identity-deleted"; subjectId: string }
  | { status: "ignored" }
  | { status: "unverified" };

export interface IdentityWebhookVerifier {
  verify(request: Request): Promise<IdentityWebhook>;
}
