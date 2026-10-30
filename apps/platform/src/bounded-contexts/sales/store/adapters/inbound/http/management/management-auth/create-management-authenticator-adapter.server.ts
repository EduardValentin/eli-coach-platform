import type { ManagementApiConfig } from "~/bounded-contexts/sales/store/config.server";

import { BearerSecretManagementAuthenticatorAdapter } from "./bearer-secret-management-authenticator-adapter.server";
import type { ManagementAuthenticatorPort } from "./management-authenticator-port.server";
import { MANAGEMENT_AGENT_PRINCIPAL_ID } from "./management-auth-config.server";

export function createManagementAuthenticatorAdapter(
  config: ManagementApiConfig,
): ManagementAuthenticatorPort {
  return new BearerSecretManagementAuthenticatorAdapter({
    principalId: MANAGEMENT_AGENT_PRINCIPAL_ID,
    secret: config.MANAGEMENT_API_SECRET,
  });
}
