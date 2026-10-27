type ManagementTransportPolicy = "any" | "https_required";

type ManagementPrincipal = {
  id: string;
  kind: "machine" | "user";
};

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
