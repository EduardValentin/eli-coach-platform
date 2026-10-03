import type { PaymentsConfig } from "@eli-coach-platform/config";

import { InMemoryPaymentEvents } from "./memory/in-memory-payment-events.server";
import type { PaymentEvents } from "./payment-events.server";
import { createStripePaymentEvents } from "./stripe/stripe-payment-events.server";
import { STRIPE_VOCABULARY } from "./stripe/stripe-vocabulary.server";

export function createPaymentEvents(config: PaymentsConfig): PaymentEvents {
  if (config.PAYMENTS_PROVIDER === "memory") {
    return new InMemoryPaymentEvents(STRIPE_VOCABULARY);
  }

  return createStripePaymentEvents(config);
}
