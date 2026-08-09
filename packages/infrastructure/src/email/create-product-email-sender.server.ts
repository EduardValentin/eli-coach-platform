import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { Resend } from "resend";

import type { ProductEmailSender } from "./product-email-sender.server";
import { ResendProductEmailSender } from "./resend-product-email-sender.server";

export function createProductEmailSender(
  runtimeEnvironment: RuntimeEnvironment,
): ProductEmailSender {
  return new ResendProductEmailSender({
    client: new Resend(runtimeEnvironment.RESEND_API_KEY),
    fromAddress: runtimeEnvironment.PRODUCT_EMAIL_FROM_ADDRESS,
    fromName: runtimeEnvironment.PRODUCT_EMAIL_FROM_NAME,
    replyTo: runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
  });
}
