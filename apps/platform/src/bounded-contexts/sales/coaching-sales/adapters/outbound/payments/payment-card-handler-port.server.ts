import type { PaymentEventHandling } from "./payment-event-handlers.server";
import type { PaymentCardChange } from "./payment-event-types.server";

export interface PaymentCardHandlerPort {
  handle(
    eventId: string,
    change: PaymentCardChange,
  ): Promise<PaymentEventHandling>;
}
