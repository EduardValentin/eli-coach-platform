import { PaymentEventReader } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-reader.server";
import type { PaymentEventVerdict } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-types.server";
import type { PaymentEvents } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-events.server";
import type { PaymentProviderVocabulary } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-provider-vocabulary.server";

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
