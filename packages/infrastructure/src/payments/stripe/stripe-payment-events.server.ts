import type { PaymentsConfig } from "@eli-coach-platform/config";
import Stripe from "stripe";

import { readPaymentEvent } from "../payment-event-verdict.server";
import type {
  PaymentEvents,
  PaymentEventVerdict,
} from "../payment-events.server";

type StripeWebhooks = {
  constructEvent(payload: string, header: string, secret: string): unknown;
};

type StripePaymentEventsOptions = {
  webhooks: StripeWebhooks;
  signingSecret: string;
};

export class StripePaymentEvents implements PaymentEvents {
  constructor(private readonly options: StripePaymentEventsOptions) {}

  async verify(
    rawBody: string,
    signature: string | null,
  ): Promise<PaymentEventVerdict> {
    if (!signature) {
      return { kind: "invalid" };
    }

    try {
      return readPaymentEvent(
        this.options.webhooks.constructEvent(
          rawBody,
          signature,
          this.options.signingSecret,
        ),
      );
    } catch (error) {
      if (isUnverifiableEvent(error)) {
        return { kind: "invalid" };
      }

      throw error;
    }
  }
}

function isUnverifiableEvent(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeSignatureVerificationError ||
    error instanceof SyntaxError
  );
}

export function createStripePaymentEvents(
  config: PaymentsConfig,
): StripePaymentEvents {
  if (!config.STRIPE_WEBHOOK_SIGNING_SECRET) {
    throw new Error("Stripe payments require STRIPE_WEBHOOK_SIGNING_SECRET.");
  }

  return new StripePaymentEvents({
    webhooks: Stripe.webhooks,
    signingSecret: config.STRIPE_WEBHOOK_SIGNING_SECRET,
  });
}
