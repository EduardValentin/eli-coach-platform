import type { PaidCheckoutSession } from "~/bounded-contexts/sales/shared/payments/adapters/outbound/payment-event-types.server";

export interface PaymentCompletionHandlerPort {
  readonly purpose: string;
  handle(
    eventId: string,
    session: PaidCheckoutSession,
  ): Promise<"recorded" | "duplicate" | "ignored">;
}
