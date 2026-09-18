import type { ProductEmailConfig } from "@eli-coach-platform/config";
import { Resend } from "resend";

import { InMemoryProductEmail } from "./in-memory-product-email.server";
import type { ProductEmail } from "./product-email-contract.server";
import { ResendProductEmail } from "./resend-product-email.server";

export function createProductEmail(config: ProductEmailConfig): ProductEmail {
  if (config.PRODUCT_EMAIL_PROVIDER === "memory") {
    return new InMemoryProductEmail();
  }

  return new ResendProductEmail({
    client: new Resend(config.RESEND_API_KEY),
    fromAddress: config.PRODUCT_EMAIL_FROM_ADDRESS,
    fromName: config.PRODUCT_EMAIL_FROM_NAME,
    replyTo: config.PRODUCT_EMAIL_REPLY_TO,
  });
}
