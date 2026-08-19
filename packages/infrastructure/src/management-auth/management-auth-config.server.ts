import type { RuntimeEnvironment } from "@eli-coach-platform/config";

import type { ManagementAuthConfig } from "./management-auth-contract.server";

/**
 * One shared secret means one identity. When the coach reaches these flows
 * through Clerk, her own identifier replaces this constant for her requests.
 */
export const MANAGEMENT_AGENT_PRINCIPAL_ID = "management-api-agent";

export function createManagementAuthConfig(
  runtimeEnvironment: RuntimeEnvironment,
): ManagementAuthConfig {
  return {
    principalId: MANAGEMENT_AGENT_PRINCIPAL_ID,
    secret: runtimeEnvironment.MANAGEMENT_API_SECRET,
    transportPolicy:
      runtimeEnvironment.ENVIRONMENT === "local" ? "any" : "https_required",
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
