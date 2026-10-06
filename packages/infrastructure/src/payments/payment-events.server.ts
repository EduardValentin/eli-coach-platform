import type { PaymentEventVerdict } from "./payment-event-types.server";

export interface PaymentEvents {
  verify(
    rawBody: string,
    signature: string | null,
  ): Promise<PaymentEventVerdict>;
}
