export type ManagementPrincipal = {
  id: string;
  kind: "machine" | "user";
};

/**
 * `forbidden` and `unavailable` exist for mechanisms this repository does not
 * have yet. The coach will reach these flows through an ordinary user session,
 * so an authenticated principal without management capability has to be
 * distinguishable from an absent credential; and an authentication provider
 * that cannot be reached has to surface as infrastructure failure rather than
 * as a denial. The bearer-secret adapter produces neither.
 */
export type ManagementAuthenticationResult =
  | { status: "authenticated"; principal: ManagementPrincipal }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "unavailable" };

export interface ManagementAuthenticator {
  authenticate(request: Request): Promise<ManagementAuthenticationResult>;
}

export type ManagementTransportPolicy = "any" | "https_required";

export type ManagementAuthConfig = {
  principalId: string;
  secret: string;
  transportPolicy: ManagementTransportPolicy;
};
