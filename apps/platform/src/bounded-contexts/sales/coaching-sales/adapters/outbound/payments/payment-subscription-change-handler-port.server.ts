import type { PaymentEventHandling } from "./payment-event-handlers.server";
import type { PaymentSubscriptionChange } from "./payment-event-types.server";

export interface PaymentSubscriptionChangeHandlerPort {
  readonly purpose: string;
  handle(
    eventId: string,
    change: PaymentSubscriptionChange,
  ): Promise<PaymentEventHandling>;
}
