import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { EVOA_FITNESS_PRIVACY_EMAIL } from "@eli-coach-platform/content";
import { createProductEmailSender } from "@eli-coach-platform/infrastructure/email/server";

import { DisabledWaitlistConfirmationService } from "./disabled-waitlist-confirmation-service.server";
import { EmailWaitlistConfirmationService } from "./email-waitlist-confirmation-service.server";

type CreateWaitlistConfirmationServiceOptions = {
  runtimeEnvironment: RuntimeEnvironment;
};

export function createWaitlistConfirmationService(
  options: CreateWaitlistConfirmationServiceOptions,
) {
  if (options.runtimeEnvironment.PRODUCT_EMAIL_PROVIDER === "disabled") {
    return new DisabledWaitlistConfirmationService();
  }

  return new EmailWaitlistConfirmationService(
    createProductEmailSender(options.runtimeEnvironment),
    {
      contactEmail: options.runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
      privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
    },
  );
}
