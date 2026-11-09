import type { Order } from "./order";

export type OrderLinkIssue = "original" | "replacement";

export type OrderEmailDelivery = {
  order: Order;
  deliveryAttemptId: number;
  provider: string;
  providerIdempotencyKey: string;
  rawToken: string;
  tokenSha256: string;
  linkIssue: OrderLinkIssue;
  at: Date;
};
