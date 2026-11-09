import type { PaymentsConfig } from "~/bounded-contexts/sales/shared/payments/config.server";

import { InMemoryPaymentEventsAdapter } from "./memory/in-memory-payment-events-adapter.server";
import type { PaymentProvider } from "./payment-provider.server";
import { createStripeClient } from "./stripe/stripe-client.server";
import { StripePaymentEventsAdapter } from "./stripe/stripe-payment-events-adapter.server";
import { STRIPE_VOCABULARY } from "./stripe/stripe-vocabulary.server";

export function createPaymentProviderAdapter(
  config: PaymentsConfig,
): PaymentProvider {
  if (config.PAYMENTS_PROVIDER === "memory") {
    return {
      name: "memory",
      paymentEventsPort: new InMemoryPaymentEventsAdapter(STRIPE_VOCABULARY),
    };
  }

  const stripeClient = createStripeClient(config);

  if (!config.STRIPE_WEBHOOK_SIGNING_SECRET) {
    throw new Error("Stripe payments require STRIPE_WEBHOOK_SIGNING_SECRET.");
  }

  return {
    name: "stripe",
    stripeClient,
    paymentEventsPort: new StripePaymentEventsAdapter({
      webhooks: stripeClient.webhooks,
      signingSecret: config.STRIPE_WEBHOOK_SIGNING_SECRET,
    }),
  };
}
