import type { PaymentEventVerdict } from "./payment-event-verdict.server";

export type { PaymentEventVerdict } from "./payment-event-verdict.server";

export interface PaymentEvents {
  verify(
    rawBody: string,
    signature: string | null,
  ): Promise<PaymentEventVerdict>;
}
