import type { ApiKeyAccountsFacade } from "~/bounded-contexts/access/public/api-key-accounts-facade";
import type {
  ManagementAuthenticationResult,
  ManagementAuthenticatorPort,
  ManagementCredentials,
} from "~/bounded-contexts/sales/store/adapters/inbound/http/management/management-auth/management-authenticator-port.server";

export class ApiKeyManagementAuthenticatorAdapter implements ManagementAuthenticatorPort {
  constructor(private readonly apiKeyAccountsFacade: ApiKeyAccountsFacade) {}

  async authenticate(
    credentials: ManagementCredentials,
  ): Promise<ManagementAuthenticationResult> {
    const resolution = await this.apiKeyAccountsFacade.resolve(
      credentials.authorizationHeader,
    );

    switch (resolution.status) {
      case "resolved":
        return resolution.account.role === "COACH"
          ? {
              status: "authenticated",
              principal: { kind: "user", id: resolution.account.id },
            }
          : { status: "forbidden" };
      case "unprovisioned":
        return { status: "forbidden" };
      case "invalid":
        return { status: "unauthenticated" };
      case "unavailable":
        return { status: "unavailable" };
    }
  }
}
