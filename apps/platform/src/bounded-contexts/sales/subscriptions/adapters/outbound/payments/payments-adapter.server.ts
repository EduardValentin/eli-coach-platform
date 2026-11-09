import type { PaymentProvider } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-provider.server";
import type {
  PaymentCheckoutPort,
  PaymentCustomerCardsPort,
  PaymentSubscriptionsPort,
} from "~/bounded-contexts/sales/subscriptions/domain/coaching-subscription";

import { InMemoryPaymentCheckoutAdapter } from "./memory/in-memory-payment-checkout-adapter.server";
import { InMemoryPaymentCustomerCardsAdapter } from "./memory/in-memory-payment-customer-cards-adapter.server";
import { InMemoryPaymentSubscriptionsAdapter } from "./memory/in-memory-payment-subscriptions-adapter.server";
import { StripePaymentCheckoutAdapter } from "./stripe/stripe-payment-checkout-adapter.server";
import { StripePaymentCustomerCardsAdapter } from "./stripe/stripe-payment-customer-cards-adapter.server";
import { StripePaymentSubscriptionsAdapter } from "./stripe/stripe-payment-subscriptions-adapter.server";

type PaymentsAdapterOptions = {
  paymentProvider: PaymentProvider;
  portalConfigurationId?: string;
};

export class PaymentsAdapter {
  readonly paymentCheckoutPort: PaymentCheckoutPort;
  readonly paymentSubscriptionsPort: PaymentSubscriptionsPort;
  readonly paymentCustomerCardsPort: PaymentCustomerCardsPort;

  constructor({
    paymentProvider,
    portalConfigurationId,
  }: PaymentsAdapterOptions) {
    if (paymentProvider.name === "memory") {
      this.paymentCheckoutPort = new InMemoryPaymentCheckoutAdapter();
      this.paymentSubscriptionsPort = new InMemoryPaymentSubscriptionsAdapter();
      this.paymentCustomerCardsPort = new InMemoryPaymentCustomerCardsAdapter();
      return;
    }

    const { stripeClient } = paymentProvider;

    this.paymentCheckoutPort = new StripePaymentCheckoutAdapter(stripeClient);
    this.paymentSubscriptionsPort = new StripePaymentSubscriptionsAdapter(
      stripeClient,
      { portalConfigurationId },
    );
    this.paymentCustomerCardsPort = new StripePaymentCustomerCardsAdapter(
      stripeClient,
    );
  }
}
