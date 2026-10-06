import Stripe from "stripe";

import { PaymentEventReader } from "../payment-event-reader.server";
import type { PaymentEventVerdict } from "../payment-event-types.server";
import type { PaymentEvents } from "../payment-events.server";

import { STRIPE_VOCABULARY } from "./stripe-vocabulary.server";

type StripeWebhooks = {
  constructEvent(payload: string, header: string, secret: string): unknown;
};

type StripePaymentEventsOptions = {
  webhooks: StripeWebhooks;
  signingSecret: string;
};

export class StripePaymentEvents implements PaymentEvents {
  private readonly reader = new PaymentEventReader(STRIPE_VOCABULARY);

  constructor(private readonly options: StripePaymentEventsOptions) {}

  async verify(
    rawBody: string,
    signature: string | null,
  ): Promise<PaymentEventVerdict> {
    if (!signature) {
      return { kind: "invalid" };
    }

    try {
      return this.reader.read(
        this.options.webhooks.constructEvent(
          rawBody,
          signature,
          this.options.signingSecret,
        ),
      );
    } catch (error) {
      if (StripePaymentEvents.isUnverifiableEvent(error)) {
        return { kind: "invalid" };
      }

      throw error;
    }
  }

  private static isUnverifiableEvent(error: unknown): boolean {
    return (
      error instanceof Stripe.errors.StripeSignatureVerificationError ||
      error instanceof SyntaxError
    );
  }
}
