import type { PaymentsConfig } from "@eli-coach-platform/config";
import type { PaymentCustomerCards } from "@eli-coach-platform/domain/coaching-subscription";

import { InMemoryPaymentCustomerCards } from "./memory/in-memory-payment-customer-cards.server";
import { createStripeClient } from "./stripe/stripe-client.server";
import { StripePaymentCustomerCards } from "./stripe/stripe-payment-customer-cards.server";

export function createPaymentCustomerCards(
  config: PaymentsConfig,
): PaymentCustomerCards {
  if (config.PAYMENTS_PROVIDER === "memory") {
    return new InMemoryPaymentCustomerCards();
  }

  return new StripePaymentCustomerCards(createStripeClient(config));
}
