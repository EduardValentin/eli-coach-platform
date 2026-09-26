import type { PaymentsConfig } from "@eli-coach-platform/config";
import type { PaymentCheckout } from "@eli-coach-platform/domain/coaching-subscription";

import { InMemoryPaymentCheckout } from "./memory/in-memory-payment-checkout.server";
import { createStripeClient } from "./stripe/stripe-client.server";
import { StripePaymentCheckout } from "./stripe/stripe-payment-checkout.server";

export function createPaymentCheckout(config: PaymentsConfig): PaymentCheckout {
  if (config.PAYMENTS_PROVIDER === "memory") {
    return new InMemoryPaymentCheckout();
  }

  return new StripePaymentCheckout(createStripeClient(config));
}
