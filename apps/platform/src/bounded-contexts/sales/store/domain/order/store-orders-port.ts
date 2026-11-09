import type { StoreDeliveryLimitWindow } from "../acquisition";

import type { Order } from "./order";

export type OrderRecording =
  | { status: "placed" }
  | { status: "exists"; order: Order }
  | {
      status: "unavailable_products";
      availableProductSlugs: readonly string[];
    };

type OrderEmailAttempt = {
  provider: string;
  providerIdempotencyKey: string;
};

export type RecordOrderPaymentCommand = {
  order: Order;
  tokenSha256: string;
  grantExpiresAt: Date;
  attempt: OrderEmailAttempt;
  at: Date;
};

export type PrepareOrderResendCommand = {
  orderId: string;
  tokenSha256: string;
  attempt: OrderEmailAttempt;
  at: Date;
  cooldownSince: Date;
  dailyWindowSince: Date;
  dailyLimit: number;
};

export type OrderResendPreparation =
  | { status: "prepared"; deliveryAttemptId: number }
  | { status: "rate_limited"; window: StoreDeliveryLimitWindow }
  | { status: "grant_unavailable" };

export interface StoreOrdersPort {
  findByIdempotencyKey(idempotencyKey: string): Promise<Order | null>;
  findByCheckoutSession(sessionId: string): Promise<Order | null>;
  findForPayment(orderId: string): Promise<Order | null>;
  place(order: Order): Promise<OrderRecording>;
  attachCheckout(command: {
    orderId: string;
    sessionId: string;
    url: string;
  }): Promise<void>;
  recordPayment(
    command: RecordOrderPaymentCommand,
  ): Promise<{ deliveryAttemptId: number }>;
  prepareResend(
    command: PrepareOrderResendCommand,
  ): Promise<OrderResendPreparation>;
  recordEmailAccepted(command: {
    deliveryAttemptId: number;
    provider: string;
    providerMessageId: string;
  }): Promise<void>;
  recordEmailRejected(command: { deliveryAttemptId: number }): Promise<void>;
  recordEmailRetryable(command: { deliveryAttemptId: number }): Promise<void>;
}
