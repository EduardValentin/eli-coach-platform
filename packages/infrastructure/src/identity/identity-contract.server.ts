export type IdentityConfig = {
  accountPortalUrl: string;
  apiUrl?: string;
  publishableKey: string;
  secretKey: string;
};

export type VerifiedIdentity = {
  email: string | null;
  sessionId: string;
  subjectId: string;
};

/**
 * The third arm is the one that is easy to miss. Clerk answers some requests
 * with a redirect it needs the browser to follow — the handshake that renews an
 * expired session token, and, on a development instance, the dev-browser sync
 * that plants `__clerk_db_jwt` on this domain. A caller that builds its own
 * response instead of returning this one leaves the visitor signed out with no
 * error to explain it.
 */
export type IdentityAuthentication =
  | { status: "authenticated"; identity: VerifiedIdentity }
  | { status: "anonymous" }
  | { status: "redirect"; response: Response };

export interface IdentityProvider {
  authenticate(request: Request): Promise<IdentityAuthentication>;
  buildSignInUrl(returnUrl: string): string;
  signOut(sessionId: string): Promise<void>;
}
