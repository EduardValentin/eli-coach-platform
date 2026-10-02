import type {
  PaymentRefund,
  PaymentSubscriptionChange,
} from "./payment-subscription-change.server";

export type PaymentEventHandling = "recorded" | "duplicate" | "ignored";

export interface PaymentSubscriptionChangeHandler {
  readonly purpose: string;
  handle(
    eventId: string,
    change: PaymentSubscriptionChange,
  ): Promise<PaymentEventHandling>;
}

export interface PaymentRefundHandler {
  handle(eventId: string, refund: PaymentRefund): Promise<PaymentEventHandling>;
}
