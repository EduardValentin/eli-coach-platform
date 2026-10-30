import type { ProductDeliveryPort } from "~/bounded-contexts/sales/store/domain/acquisition";
import type { ProductEmailPort } from "~/shared/email/index.server";

import { EmailProductDeliveryAdapter } from "./email-product-delivery-adapter.server";

type CreateProductDeliveryOptions = {
  appBasePath: string;
  contactEmail: string;
  publicAppUrl: string;
};

export function createProductDeliveryAdapter(
  productEmailPort: ProductEmailPort,
  options: CreateProductDeliveryOptions,
): ProductDeliveryPort {
  return new EmailProductDeliveryAdapter(productEmailPort, options);
}
