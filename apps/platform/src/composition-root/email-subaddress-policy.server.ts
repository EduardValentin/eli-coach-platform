import type { AppConfig } from "~/composition-root/runtime-environment";
import type { EmailSubaddressPolicy } from "~/shared/submission-checks/email-address";

export function resolveEmailSubaddressPolicy(
  environment: Pick<AppConfig, "ENVIRONMENT">,
): EmailSubaddressPolicy {
  return environment.ENVIRONMENT === "production" ? "refused" : "allowed";
}
