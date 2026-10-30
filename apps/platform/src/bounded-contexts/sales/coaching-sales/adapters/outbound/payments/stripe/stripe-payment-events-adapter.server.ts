import Stripe from "stripe";

import { PaymentEventReaderAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-reader-adapter.server";
import type { PaymentEventVerdict } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-types.server";
import type { PaymentEventsPort } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-events-port.server";

import { STRIPE_VOCABULARY } from "./stripe-vocabulary.server";

type StripeWebhooks = {
  constructEvent(payload: string, header: string, secret: string): unknown;
};

type StripePaymentEventsOptions = {
  webhooks: StripeWebhooks;
  signingSecret: string;
};

export class StripePaymentEventsAdapter implements PaymentEventsPort {
  private readonly paymentEventReaderAdapter = new PaymentEventReaderAdapter(
    STRIPE_VOCABULARY,
  );

  constructor(private readonly options: StripePaymentEventsOptions) {}

  async verify(
    rawBody: string,
    signature: string | null,
  ): Promise<PaymentEventVerdict> {
    if (!signature) {
      return { kind: "invalid" };
    }

    try {
      return this.paymentEventReaderAdapter.read(
        this.options.webhooks.constructEvent(
          rawBody,
          signature,
          this.options.signingSecret,
        ),
      );
    } catch (error) {
      if (this.isUnverifiableEvent(error)) {
        return { kind: "invalid" };
      }

      throw error;
    }
  }

  private isUnverifiableEvent(error: unknown): boolean {
    return (
      error instanceof Stripe.errors.StripeSignatureVerificationError ||
      error instanceof SyntaxError
    );
  }
}
