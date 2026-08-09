import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { EVOA_FITNESS_PRIVACY_EMAIL } from "@eli-coach-platform/content";
import { ResendProductEmailSender } from "@eli-coach-platform/infrastructure/email/server";
import { Resend } from "resend";

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

  const resendSender = new ResendProductEmailSender({
    client: new Resend(options.runtimeEnvironment.RESEND_API_KEY),
    fromAddress: options.runtimeEnvironment.PRODUCT_EMAIL_FROM_ADDRESS,
    fromName: options.runtimeEnvironment.PRODUCT_EMAIL_FROM_NAME,
    replyTo: options.runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
  });

  return new EmailWaitlistConfirmationService(resendSender, {
    contactEmail: options.runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
    privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
  });
}
