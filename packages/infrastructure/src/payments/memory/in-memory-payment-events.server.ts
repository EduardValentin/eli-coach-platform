import type {
  PaymentEvents,
  PaymentEventVerdict,
} from "../payment-events.server";
import { StripePaymentEvents } from "../stripe/stripe-payment-events.server";

const MEMORY_SIGNATURE = "memory";
const UNUSED_SIGNING_SECRET = "unsigned";

const unsignedWebhooks = {
  constructEvent(payload: string): unknown {
    return JSON.parse(payload);
  },
};

export class InMemoryPaymentEvents implements PaymentEvents {
  private readonly unsignedEventReader = new StripePaymentEvents({
    webhooks: unsignedWebhooks,
    signingSecret: UNUSED_SIGNING_SECRET,
  });

  async verify(
    rawBody: string,
    signature: string | null,
  ): Promise<PaymentEventVerdict> {
    if (signature !== MEMORY_SIGNATURE) {
      return { kind: "invalid" };
    }

    return this.unsignedEventReader.verify(rawBody, signature);
  }
}
