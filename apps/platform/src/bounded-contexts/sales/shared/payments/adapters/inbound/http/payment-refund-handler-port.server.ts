import type { PaymentEventHandling } from "./payment-event-handlers.server";
import type { PaymentRefund } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-event-types.server";

export interface PaymentRefundHandlerPort {
  handle(eventId: string, refund: PaymentRefund): Promise<PaymentEventHandling>;
}
