import type { ManagementApiConfig } from "~/bounded-contexts/sales/store/config.server";

import type { ManagementAuthConfig } from "./management-authenticator-port.server";

/**
 * One shared secret means one identity. When the coach reaches these flows
 * through Clerk, her own identifier replaces this constant for her requests.
 */
export const MANAGEMENT_AGENT_PRINCIPAL_ID = "management-api-agent";

export function createManagementAuthConfig(
  managementApi: ManagementApiConfig,
  app: { PUBLIC_APP_URL: string },
): ManagementAuthConfig {
  return {
    principalId: MANAGEMENT_AGENT_PRINCIPAL_ID,
    secret: managementApi.MANAGEMENT_API_SECRET,
    transportPolicy:
      new URL(app.PUBLIC_APP_URL).protocol === "https:"
        ? "https_required"
        : "any",
  };
}

export function isSecureManagementTransport(request: Request): boolean {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProtocol) {
    return forwardedProtocol === "https";
  }

  return new URL(request.url).protocol === "https:";
}
