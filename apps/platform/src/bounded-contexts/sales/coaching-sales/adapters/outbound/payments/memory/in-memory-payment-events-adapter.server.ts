import { PaymentEventReaderAdapter } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-reader-adapter.server";
import type { PaymentEventVerdict } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-event-types.server";
import type { PaymentEventsPort } from "~/bounded-contexts/sales/coaching-sales/adapters/outbound/payments/payment-events-port.server";
import type { PaymentProviderVocabularyPort } from "../payment-provider-vocabulary-port.server";

const MEMORY_SIGNATURE = "memory";

export class InMemoryPaymentEventsAdapter implements PaymentEventsPort {
  private readonly paymentEventReaderAdapter: PaymentEventReaderAdapter;

  constructor(paymentProviderVocabularyPort: PaymentProviderVocabularyPort) {
    this.paymentEventReaderAdapter = new PaymentEventReaderAdapter(
      paymentProviderVocabularyPort,
    );
  }

  async verify(
    rawBody: string,
    signature: string | null,
  ): Promise<PaymentEventVerdict> {
    if (signature !== MEMORY_SIGNATURE) {
      return { kind: "invalid" };
    }

    try {
      return this.paymentEventReaderAdapter.read(JSON.parse(rawBody));
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { kind: "invalid" };
      }

      throw error;
    }
  }
}
