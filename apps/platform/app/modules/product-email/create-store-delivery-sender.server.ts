import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { Resend } from "resend";

import { DisabledStoreDeliveryEmailSender } from "./disabled-store-delivery-email-sender.server";
import { ResendProductEmailSender } from "./resend-product-email-sender.server";
import { ResendStoreDeliveryEmailSender } from "./resend-store-delivery-email-sender.server";

export function createStoreDeliverySender(
  runtimeEnvironment: RuntimeEnvironment,
) {
  if (runtimeEnvironment.PRODUCT_EMAIL_PROVIDER === "disabled") {
    return new DisabledStoreDeliveryEmailSender();
  }

  const productEmailSender = new ResendProductEmailSender({
    client: new Resend(runtimeEnvironment.RESEND_API_KEY),
    fromAddress: runtimeEnvironment.PRODUCT_EMAIL_FROM_ADDRESS,
    fromName: runtimeEnvironment.PRODUCT_EMAIL_FROM_NAME,
    replyTo: runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
  });

  return new ResendStoreDeliveryEmailSender(productEmailSender, {
    appBasePath: runtimeEnvironment.APP_BASE_PATH,
    contactEmail: runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
    publicAppUrl: runtimeEnvironment.PUBLIC_APP_URL!,
  });
}
