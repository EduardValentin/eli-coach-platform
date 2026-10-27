import type { ProductDelivery } from "~/bounded-contexts/sales/store/domain/acquisition";
import type { ProductEmail } from "~/shared/email/index.server";

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
