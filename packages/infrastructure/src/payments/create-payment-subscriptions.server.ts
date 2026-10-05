import type { PaymentsConfig } from "@eli-coach-platform/config";
import type { PaymentSubscriptions } from "@eli-coach-platform/domain/coaching-subscription";

import { InMemoryPaymentSubscriptions } from "./memory/in-memory-payment-subscriptions.server";
import { createStripeClient } from "./stripe/stripe-client.server";
import { StripePaymentSubscriptions } from "./stripe/stripe-payment-subscriptions.server";

export function createPaymentSubscriptions(
  config: PaymentsConfig,
): PaymentSubscriptions {
  if (config.PAYMENTS_PROVIDER === "memory") {
    return new InMemoryPaymentSubscriptions();
  }

  return new StripePaymentSubscriptions(createStripeClient(config), {
    portalConfigurationId: config.STRIPE_PORTAL_CONFIGURATION_ID,
  });
}
