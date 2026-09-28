import type { AppConfig } from "@eli-coach-platform/config";
import type { EmailSubaddressPolicy } from "@eli-coach-platform/domain/email-address";

export function resolveEmailSubaddressPolicy(
  environment: Pick<AppConfig, "ENVIRONMENT">,
): EmailSubaddressPolicy {
  return environment.ENVIRONMENT === "production" ? "refused" : "allowed";
}
