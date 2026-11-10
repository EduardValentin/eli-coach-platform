import type { PaymentEventHandling } from "./payment-event-handlers.server";
import type { PaymentCardChange } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-event-types.server";

export interface PaymentCardHandlerPort {
  handle(
    eventId: string,
    change: PaymentCardChange,
  ): Promise<PaymentEventHandling>;
}
