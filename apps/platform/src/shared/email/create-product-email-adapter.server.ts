import type { ProductEmailConfig } from "~/shared/email/product-email-config";
import { Resend } from "resend";

import { InMemoryProductEmailAdapter } from "./in-memory-product-email-adapter.server";
import type { ProductEmailPort } from "./product-email-port.server";
import { ResendProductEmailAdapter } from "./resend-product-email-adapter.server";

export function createProductEmailAdapter(
  config: ProductEmailConfig,
): ProductEmailPort {
  if (config.PRODUCT_EMAIL_PROVIDER === "memory") {
    return new InMemoryProductEmailAdapter();
  }

  return new ResendProductEmailAdapter({
    client: new Resend(config.RESEND_API_KEY),
    fromAddress: config.PRODUCT_EMAIL_FROM_ADDRESS,
    fromName: config.PRODUCT_EMAIL_FROM_NAME,
    replyTo: config.PRODUCT_EMAIL_REPLY_TO,
  });
}
