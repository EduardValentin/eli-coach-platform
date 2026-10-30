import type { PaymentEventHandling } from "./payment-event-handlers.server";
import type { PaymentRefund } from "./payment-event-types.server";

export interface PaymentRefundHandlerPort {
  handle(eventId: string, refund: PaymentRefund): Promise<PaymentEventHandling>;
}
