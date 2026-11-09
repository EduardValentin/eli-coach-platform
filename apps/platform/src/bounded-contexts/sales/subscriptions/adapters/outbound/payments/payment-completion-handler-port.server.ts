import type { PaidCheckoutSession } from "./payment-event-types.server";

export interface PaymentCompletionHandlerPort {
  readonly purpose: string;
  handle(
    eventId: string,
    session: PaidCheckoutSession,
  ): Promise<"recorded" | "duplicate" | "ignored">;
}
