import type { RuntimeEnvironment } from "@eli-coach-platform/config";
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

  return new WaitlistConfirmationEmailSender(resendSender);
}
