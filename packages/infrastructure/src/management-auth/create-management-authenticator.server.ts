import type { ManagementApiConfig } from "@eli-coach-platform/config";
import type { ManagementAuthenticator } from "@eli-coach-platform/domain/shared";

import { BearerSecretManagementAuthenticator } from "./bearer-secret-authenticator.server";
import { MANAGEMENT_AGENT_PRINCIPAL_ID } from "./management-auth-config.server";

export function createManagementAuthenticator(
  config: ManagementApiConfig,
): ManagementAuthenticator {
  return new BearerSecretManagementAuthenticator({
    principalId: MANAGEMENT_AGENT_PRINCIPAL_ID,
    secret: config.MANAGEMENT_API_SECRET,
  });
}
