import type { PaymentEventVerdict } from "./payment-event-types.server";

export interface PaymentEventsPort {
  verify(
    rawBody: string,
    signature: string | null,
  ): Promise<PaymentEventVerdict>;
}
