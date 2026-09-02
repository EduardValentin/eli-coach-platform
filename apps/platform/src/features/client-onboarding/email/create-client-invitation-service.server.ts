import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { createProductEmailSender } from "@eli-coach-platform/infrastructure/email/server";

import { DisabledClientInvitationService } from "./disabled-client-invitation-service.server";
import { EmailClientInvitationService } from "./email-client-invitation-service.server";

type CreateClientInvitationServiceOptions = {
  runtimeEnvironment: RuntimeEnvironment;
};

export function createClientInvitationService(
  options: CreateClientInvitationServiceOptions,
) {
  if (options.runtimeEnvironment.PRODUCT_EMAIL_PROVIDER === "disabled") {
    return new DisabledClientInvitationService();
  }

  return new EmailClientInvitationService(
    createProductEmailSender(options.runtimeEnvironment),
    { contactEmail: options.runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO },
  );
}
