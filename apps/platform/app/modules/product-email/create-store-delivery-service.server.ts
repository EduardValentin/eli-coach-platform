import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { Resend } from "resend";

import { DisabledStoreDeliveryService } from "./disabled-store-delivery-service.server";
import { ResendProductEmailSender } from "./resend-product-email-sender.server";
import { EmailStoreDeliveryService } from "./email-store-delivery-service.server";

export function createStoreDeliveryService(
  runtimeEnvironment: RuntimeEnvironment,
) {
  if (runtimeEnvironment.PRODUCT_EMAIL_PROVIDER === "disabled") {
    return new DisabledStoreDeliveryService();
  }

  const productEmailSender = new ResendProductEmailSender({
    client: new Resend(runtimeEnvironment.RESEND_API_KEY),
    fromAddress: runtimeEnvironment.PRODUCT_EMAIL_FROM_ADDRESS,
    fromName: runtimeEnvironment.PRODUCT_EMAIL_FROM_NAME,
    replyTo: runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
  });

  return new EmailStoreDeliveryService(productEmailSender, {
    appBasePath: runtimeEnvironment.APP_BASE_PATH,
    contactEmail: runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
    publicAppUrl: runtimeEnvironment.PUBLIC_APP_URL!,
  });
}
