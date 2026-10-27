import type { ManagementApiConfig } from "~/bounded-contexts/sales/store/config.server";

import { BearerSecretManagementAuthenticator } from "./bearer-secret-authenticator.server";
import type { ManagementAuthenticator } from "./management-authenticator-contract.server";
import { MANAGEMENT_AGENT_PRINCIPAL_ID } from "./management-auth-config.server";

export function createManagementAuthenticator(
  config: ManagementApiConfig,
): ManagementAuthenticator {
  return new BearerSecretManagementAuthenticator({
    principalId: MANAGEMENT_AGENT_PRINCIPAL_ID,
    secret: config.MANAGEMENT_API_SECRET,
  });
}
