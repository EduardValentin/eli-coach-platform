import { PaymentEventReader } from "../payment-event-reader.server";
import type { PaymentEventVerdict } from "../payment-event-types.server";
import type { PaymentEvents } from "../payment-events.server";
import type { PaymentProviderVocabulary } from "../payment-provider-vocabulary.server";

const MEMORY_SIGNATURE = "memory";

export class InMemoryPaymentEvents implements PaymentEvents {
  private readonly reader: PaymentEventReader;

  constructor(vocabulary: PaymentProviderVocabulary) {
    this.reader = new PaymentEventReader(vocabulary);
  }

  async verify(
    rawBody: string,
    signature: string | null,
  ): Promise<PaymentEventVerdict> {
    if (signature !== MEMORY_SIGNATURE) {
      return { kind: "invalid" };
    }

    try {
      return this.reader.read(JSON.parse(rawBody));
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { kind: "invalid" };
      }

      throw error;
    }
  }
}
