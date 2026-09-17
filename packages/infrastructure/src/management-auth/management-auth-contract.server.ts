type ManagementTransportPolicy = "any" | "https_required";

type ManagementPrincipal = {
  id: string;
  kind: "machine" | "user";
};

/**
 * Future user-session authentication must distinguish an authenticated
 * principal without management capability from an absent credential, and
 * provider outages from denials. The current bearer-secret adapter produces
 * neither `forbidden` nor `unavailable`.
 */
export type ManagementAuthenticationResult =
  | { status: "authenticated"; principal: ManagementPrincipal }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "unavailable" };

export type ManagementCredentials = {
  authorizationHeader: string | null;
};

export interface ManagementAuthenticator {
  authenticate(
    credentials: ManagementCredentials,
  ): Promise<ManagementAuthenticationResult>;
}

export type ManagementAuthConfig = {
  principalId: string;
  secret: string;
  transportPolicy: ManagementTransportPolicy;
};
