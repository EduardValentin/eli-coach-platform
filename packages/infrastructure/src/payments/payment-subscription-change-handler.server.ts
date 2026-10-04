import type { PaymentCardChange } from "./payment-card-change.server";
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

export interface PaymentCardHandler {
  handle(
    eventId: string,
    change: PaymentCardChange,
  ): Promise<PaymentEventHandling>;
}
