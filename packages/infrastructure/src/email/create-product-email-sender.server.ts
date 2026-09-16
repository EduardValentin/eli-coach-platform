import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import type { ProductEmail } from "@eli-coach-platform/domain/shared";
import { Resend } from "resend";

import { ResendProductEmail } from "./resend-product-email.server";

export function createProductEmailSender(
  runtimeEnvironment: RuntimeEnvironment,
): ProductEmail {
  return new ResendProductEmail({
    client: new Resend(runtimeEnvironment.RESEND_API_KEY),
    fromAddress: runtimeEnvironment.PRODUCT_EMAIL_FROM_ADDRESS,
    fromName: runtimeEnvironment.PRODUCT_EMAIL_FROM_NAME,
    replyTo: runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
  });
}
