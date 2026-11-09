import type { Order } from "./order";

export type OrderEmailDelivery = {
  order: Order;
  deliveryAttemptId: number;
  provider: string;
  providerIdempotencyKey: string;
  rawToken: string;
  at: Date;
};
