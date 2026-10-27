import type { AppConfig } from "~/composition-root/runtime-environment";
import type { EmailSubaddressPolicy } from "@eli-coach-platform/domain/email-address";

export function resolveEmailSubaddressPolicy(
  environment: Pick<AppConfig, "ENVIRONMENT">,
): EmailSubaddressPolicy {
  return environment.ENVIRONMENT === "production" ? "refused" : "allowed";
}
