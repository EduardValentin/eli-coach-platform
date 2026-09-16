import type { ProductEmail } from "@eli-coach-platform/domain/shared";
import type { StoreDeliveryService } from "@eli-coach-platform/domain/store";

import { EmailStoreDeliveryService } from "./email-store-delivery-service.server";

type CreateStoreDeliveryServiceOptions = {
  appBasePath: string;
  contactEmail: string;
  publicAppUrl: string;
};

export function createStoreDeliveryService(
  productEmail: ProductEmail,
  options: CreateStoreDeliveryServiceOptions,
): StoreDeliveryService {
  return new EmailStoreDeliveryService(productEmail, options);
}
