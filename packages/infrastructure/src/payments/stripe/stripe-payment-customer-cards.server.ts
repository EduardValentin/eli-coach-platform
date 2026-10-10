import {
  PaymentCard,
  type PaymentCustomerCards,
} from "@eli-coach-platform/domain/coaching-subscription";
import type Stripe from "stripe";
import { z } from "zod";

import { readCardDetails } from "../payment-event-reader.server";
import { referencedIdSchema } from "../payment-provider-vocabulary.server";

import { STRIPE_VOCABULARY } from "./stripe-vocabulary.server";

type StripeCustomerCardsClient = {
  customers: {
    retrieve(
      id: string,
      params: Stripe.CustomerRetrieveParams,
    ): Promise<unknown>;
  };
  paymentMethods: {
    retrieve(id: string): Promise<unknown>;
  };
};

const SUBSCRIPTIONS_EXPANSION = { expand: ["subscriptions"] };

const defaultPaymentMethodSchema = z.object({
  default_payment_method: referencedIdSchema.nullish(),
});

const customerSchema = z.object({
  invoice_settings: defaultPaymentMethodSchema.nullish(),
  subscriptions: z
    .object({ data: z.array(defaultPaymentMethodSchema) })
    .nullish(),
});

export class StripePaymentCustomerCards implements PaymentCustomerCards {
  constructor(private readonly client: StripeCustomerCardsClient) {}

  async readDefaultCard(
    paymentCustomerId: string,
  ): Promise<PaymentCard | null> {
    const paymentMethodId = this.defaultPaymentMethodOf(
      await this.client.customers.retrieve(
        paymentCustomerId,
        SUBSCRIPTIONS_EXPANSION,
      ),
    );

    if (!paymentMethodId) {
      return null;
    }

    const details = readCardDetails(
      await this.client.paymentMethods.retrieve(paymentMethodId),
      STRIPE_VOCABULARY,
    );

    return details ? PaymentCard.of(details) : null;
  }

  private defaultPaymentMethodOf(customer: unknown): string | null {
    const parsed = customerSchema.safeParse(customer);

    if (!parsed.success) {
      return null;
    }

    const { invoice_settings, subscriptions } = parsed.data;
    const subscriptionDefault = subscriptions?.data.find(
      (subscription) => subscription.default_payment_method,
    )?.default_payment_method;

    return (
      invoice_settings?.default_payment_method ?? subscriptionDefault ?? null
    );
  }
}
