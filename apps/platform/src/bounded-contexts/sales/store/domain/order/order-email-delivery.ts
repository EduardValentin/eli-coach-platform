import type { Order } from "./order";

export type OrderGrantToken = "stored" | "replacement";

export type OrderEmailDelivery = {
  order: Order;
  deliveryAttemptId: number;
  provider: string;
  providerIdempotencyKey: string;
  rawToken: string;
  tokenSha256: string;
  grantToken: OrderGrantToken;
  at: Date;
};
