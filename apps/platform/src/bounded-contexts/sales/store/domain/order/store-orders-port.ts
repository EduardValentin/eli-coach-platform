import type {
  DeliveryLimitPolicy,
  StoreDeliveryLimitWindow,
} from "../acquisition";

import type { Order } from "./order";
import type { OrderCheckout } from "./order-checkout";
import type { OrderEmailAttempt } from "./order-email-attempt";

export type OrderRecording =
  | { status: "placed" }
  | { status: "exists"; order: Order }
  | {
      status: "unavailable_products";
      availableProductSlugs: readonly string[];
    };

export type AttachOrderCheckoutCommand = {
  orderId: string;
  checkout: OrderCheckout;
};

export type RecordPaymentWithGrantCommand = {
  attempt: OrderEmailAttempt;
  grantExpiresAt: Date;
  at: Date;
};

export type PrepareOrderResendCommand = {
  attempt: OrderEmailAttempt;
  at: Date;
  policy: DeliveryLimitPolicy;
};

export type OrderResendPreparation =
  | { status: "prepared"; deliveryAttemptId: number }
  | { status: "rate_limited"; window: StoreDeliveryLimitWindow }
  | { status: "grant_unavailable" };

export type RotateGrantTokenCommand = {
  orderId: string;
  tokenSha256: string;
};

export interface StoreOrdersPort {
  findByIdempotencyKey(idempotencyKey: string): Promise<Order | null>;
  findByCheckoutSession(sessionId: string): Promise<Order | null>;
  lockForPayment(orderId: string): Promise<Order | null>;
  lockByPaymentIntent(paymentIntentId: string): Promise<Order | null>;
  place(order: Order): Promise<OrderRecording>;
  attachCheckout(command: AttachOrderCheckoutCommand): Promise<void>;
  recordPaymentWithGrant(
    command: RecordPaymentWithGrantCommand,
  ): Promise<{ deliveryAttemptId: number }>;
  prepareResend(
    command: PrepareOrderResendCommand,
  ): Promise<OrderResendPreparation>;
  rotateGrantToken(command: RotateGrantTokenCommand): Promise<void>;
  recordRefund(order: Order): Promise<void>;
  recordEmailAccepted(command: {
    deliveryAttemptId: number;
    provider: string;
    providerMessageId: string;
  }): Promise<void>;
  recordEmailRejected(command: { deliveryAttemptId: number }): Promise<void>;
  recordEmailRetryable(command: { deliveryAttemptId: number }): Promise<void>;
}
