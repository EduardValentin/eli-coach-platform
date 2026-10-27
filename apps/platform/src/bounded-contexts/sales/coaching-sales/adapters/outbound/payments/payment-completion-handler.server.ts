import type { PaidCheckoutSession } from "./payment-event-types.server";

export const PAYMENT_PURPOSE_METADATA_KEY = "purpose";

export interface PaymentCompletionHandler {
  readonly purpose: string;
  handle(
    eventId: string,
    session: PaidCheckoutSession,
  ): Promise<"recorded" | "duplicate" | "ignored">;
}
