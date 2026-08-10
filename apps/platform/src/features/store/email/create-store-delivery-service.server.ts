import type { RuntimeEnvironment } from "@eli-coach-platform/config";
import { createProductEmailSender } from "@eli-coach-platform/infrastructure/email/server";

import { DisabledStoreDeliveryService } from "./disabled-store-delivery-service.server";
import { EmailStoreDeliveryService } from "./email-store-delivery-service.server";

export function createStoreDeliveryService(
  runtimeEnvironment: RuntimeEnvironment,
) {
  if (runtimeEnvironment.PRODUCT_EMAIL_PROVIDER === "disabled") {
    return new DisabledStoreDeliveryService();
  }

  return new EmailStoreDeliveryService(createProductEmailSender(runtimeEnvironment), {
    appBasePath: runtimeEnvironment.APP_BASE_PATH,
    contactEmail: runtimeEnvironment.PRODUCT_EMAIL_REPLY_TO,
    publicAppUrl: runtimeEnvironment.PUBLIC_APP_URL!,
  });
}
