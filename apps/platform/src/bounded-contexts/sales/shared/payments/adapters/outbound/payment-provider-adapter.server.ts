import type { PaymentsConfig } from "~/bounded-contexts/sales/shared/payments/config.server";

import { InMemoryPaymentEventsAdapter } from "./memory/in-memory-payment-events-adapter.server";
import type { PaymentEventsPort } from "./payment-events-port.server";
import {
  createStripeClient,
  type StripeClient,
} from "./stripe/stripe-client.server";
import { StripePaymentEventsAdapter } from "./stripe/stripe-payment-events-adapter.server";
import { STRIPE_VOCABULARY } from "./stripe/stripe-vocabulary.server";

export type PaymentProvider =
  { name: "memory" } | { name: "stripe"; stripeClient: StripeClient };

export class PaymentProviderAdapter {
  readonly paymentEventsPort: PaymentEventsPort;
  readonly paymentProvider: PaymentProvider;

  constructor(config: PaymentsConfig) {
    if (config.PAYMENTS_PROVIDER === "memory") {
      this.paymentProvider = { name: "memory" };
      this.paymentEventsPort = new InMemoryPaymentEventsAdapter(
        STRIPE_VOCABULARY,
      );
      return;
    }

    const stripeClient = createStripeClient(config);

    if (!config.STRIPE_WEBHOOK_SIGNING_SECRET) {
      throw new Error("Stripe payments require STRIPE_WEBHOOK_SIGNING_SECRET.");
    }

    this.paymentProvider = { name: "stripe", stripeClient };
    this.paymentEventsPort = new StripePaymentEventsAdapter({
      webhooks: stripeClient.webhooks,
      signingSecret: config.STRIPE_WEBHOOK_SIGNING_SECRET,
    });
  }
}
