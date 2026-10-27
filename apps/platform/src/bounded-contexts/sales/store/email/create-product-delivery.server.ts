import type { ProductDelivery } from "@eli-coach-platform/domain/acquisition";
import type { ProductEmail } from "@eli-coach-platform/infrastructure/email/server";

import { EmailProductDelivery } from "./email-product-delivery.server";

type CreateProductDeliveryOptions = {
  appBasePath: string;
  contactEmail: string;
  publicAppUrl: string;
};

export function createProductDelivery(
  productEmail: ProductEmail,
  options: CreateProductDeliveryOptions,
): ProductDelivery {
  return new EmailProductDelivery(productEmail, options);
}
