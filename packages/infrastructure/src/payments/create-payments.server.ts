import type { PaymentsConfig } from "@eli-coach-platform/config";
import type {
  PaymentCheckout,
  PaymentCustomerCards,
  PaymentSubscriptions,
} from "@eli-coach-platform/domain/coaching-subscription";

import { InMemoryPaymentCheckout } from "./memory/in-memory-payment-checkout.server";
import { InMemoryPaymentCustomerCards } from "./memory/in-memory-payment-customer-cards.server";
import { InMemoryPaymentEvents } from "./memory/in-memory-payment-events.server";
import { InMemoryPaymentSubscriptions } from "./memory/in-memory-payment-subscriptions.server";
import type { PaymentEvents } from "./payment-events.server";
import { createStripeClient } from "./stripe/stripe-client.server";
import { StripePaymentCheckout } from "./stripe/stripe-payment-checkout.server";
import { StripePaymentCustomerCards } from "./stripe/stripe-payment-customer-cards.server";
import { StripePaymentEvents } from "./stripe/stripe-payment-events.server";
import { StripePaymentSubscriptions } from "./stripe/stripe-payment-subscriptions.server";
import { STRIPE_VOCABULARY } from "./stripe/stripe-vocabulary.server";

type Payments = {
  checkout: PaymentCheckout;
  events: PaymentEvents;
  subscriptions: PaymentSubscriptions;
  customerCards: PaymentCustomerCards;
};

export function createPayments(config: PaymentsConfig): Payments {
  if (config.PAYMENTS_PROVIDER === "memory") {
    return {
      checkout: new InMemoryPaymentCheckout(),
      events: new InMemoryPaymentEvents(STRIPE_VOCABULARY),
      subscriptions: new InMemoryPaymentSubscriptions(),
      customerCards: new InMemoryPaymentCustomerCards(),
    };
  }

  const client = createStripeClient(config);

  if (!config.STRIPE_WEBHOOK_SIGNING_SECRET) {
    throw new Error("Stripe payments require STRIPE_WEBHOOK_SIGNING_SECRET.");
  }

  return {
    checkout: new StripePaymentCheckout(client),
    events: new StripePaymentEvents({
      webhooks: client.webhooks,
      signingSecret: config.STRIPE_WEBHOOK_SIGNING_SECRET,
    }),
    subscriptions: new StripePaymentSubscriptions(client, {
      portalConfigurationId: config.STRIPE_PORTAL_CONFIGURATION_ID,
    }),
    customerCards: new StripePaymentCustomerCards(client),
  };
}
