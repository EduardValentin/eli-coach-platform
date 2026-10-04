import { readPaymentEvent } from "../payment-event-verdict.server";
import type {
  PaymentEvents,
  PaymentEventVerdict,
} from "../payment-events.server";
import type { PaymentProviderVocabulary } from "../payment-provider-vocabulary.server";

const MEMORY_SIGNATURE = "memory";

export class InMemoryPaymentEvents implements PaymentEvents {
  constructor(private readonly vocabulary: PaymentProviderVocabulary) {}

  async verify(
    rawBody: string,
    signature: string | null,
  ): Promise<PaymentEventVerdict> {
    if (signature !== MEMORY_SIGNATURE) {
      return { kind: "invalid" };
    }

    try {
      return readPaymentEvent(JSON.parse(rawBody), this.vocabulary);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { kind: "invalid" };
      }

      throw error;
    }
  }
}
