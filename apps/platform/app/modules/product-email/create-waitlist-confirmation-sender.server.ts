import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { EVOA_FITNESS_PRIVACY_EMAIL } from "@eli-coach-platform/content";
import { Resend } from "resend";

import { DisabledWaitlistConfirmationSender } from "./disabled-waitlist-confirmation-sender.server";
import { ResendProductEmailSender } from "./resend-product-email-sender.server";
import { WaitlistConfirmationEmailSender } from "./waitlist-confirmation-email-sender.server";

type CreateWaitlistConfirmationSenderOptions = {
  runtimeEnvironment: RuntimeEnvironment;
};

export function createWaitlistConfirmationSender(
  options: CreateWaitlistConfirmationSenderOptions,
) {
  if (options.runtimeEnvironment.PRODUCT_EMAIL_PROVIDER === "disabled") {
    return new DisabledWaitlistConfirmationSender();
  }

  const resendSender = new ResendProductEmailSender({
    client: new Resend(options.runtimeEnvironment.RESEND_API_KEY),
    fromAddress: options.runtimeEnvironment.PRODUCT_EMAIL_FROM_ADDRESS,
    fromName: options.runtimeEnvironment.PRODUCT_EMAIL_FROM_NAME,
    replyTo: options.runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
  });

  return new WaitlistConfirmationEmailSender(resendSender, {
    contactEmail: options.runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
    privacyEmail: EVOA_FITNESS_PRIVACY_EMAIL,
  });
}
