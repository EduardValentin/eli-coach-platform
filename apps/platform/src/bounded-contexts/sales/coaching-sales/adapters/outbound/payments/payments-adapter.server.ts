import type { PaymentsConfig } from "~/bounded-contexts/sales/coaching-sales/config.server";
import type {
  PaymentCheckoutPort,
  PaymentCustomerCardsPort,
  PaymentSubscriptionsPort,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";

import { InMemoryPaymentCheckoutAdapter } from "./memory/in-memory-payment-checkout-adapter.server";
import { InMemoryPaymentCustomerCardsAdapter } from "./memory/in-memory-payment-customer-cards-adapter.server";
import { InMemoryPaymentEventsAdapter } from "./memory/in-memory-payment-events-adapter.server";
import { InMemoryPaymentSubscriptionsAdapter } from "./memory/in-memory-payment-subscriptions-adapter.server";
import type { PaymentEventsPort } from "./payment-events-port.server";
import { createStripeClient } from "./stripe/stripe-client.server";
import { StripePaymentCheckoutAdapter } from "./stripe/stripe-payment-checkout-adapter.server";
import { StripePaymentCustomerCardsAdapter } from "./stripe/stripe-payment-customer-cards-adapter.server";
import { StripePaymentEventsAdapter } from "./stripe/stripe-payment-events-adapter.server";
import { StripePaymentSubscriptionsAdapter } from "./stripe/stripe-payment-subscriptions-adapter.server";
import { STRIPE_VOCABULARY } from "./stripe/stripe-vocabulary.server";

export class PaymentsAdapter {
  readonly checkout: PaymentCheckoutPort;
  readonly events: PaymentEventsPort;
  readonly subscriptions: PaymentSubscriptionsPort;
  readonly customerCards: PaymentCustomerCardsPort;

  constructor(config: PaymentsConfig) {
    if (config.PAYMENTS_PROVIDER === "memory") {
      this.checkout = new InMemoryPaymentCheckoutAdapter();
      this.events = new InMemoryPaymentEventsAdapter(STRIPE_VOCABULARY);
      this.subscriptions = new InMemoryPaymentSubscriptionsAdapter();
      this.customerCards = new InMemoryPaymentCustomerCardsAdapter();
      return;
    }

    const client = createStripeClient(config);

    if (!config.STRIPE_WEBHOOK_SIGNING_SECRET) {
      throw new Error("Stripe payments require STRIPE_WEBHOOK_SIGNING_SECRET.");
    }

    this.checkout = new StripePaymentCheckoutAdapter(client);
    this.events = new StripePaymentEventsAdapter({
      webhooks: client.webhooks,
      signingSecret: config.STRIPE_WEBHOOK_SIGNING_SECRET,
    });
    this.subscriptions = new StripePaymentSubscriptionsAdapter(client, {
      portalConfigurationId: config.STRIPE_PORTAL_CONFIGURATION_ID,
    });
    this.customerCards = new StripePaymentCustomerCardsAdapter(client);
  }
}
