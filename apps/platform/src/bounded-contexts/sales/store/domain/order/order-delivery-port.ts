import type { StoreCurrency } from "../product";

import type { OrderLine } from "./order-item";
import type { OrderTerms } from "./order-terms-port";

export type OrderDeliveryResult =
  | { kind: "delivered"; provider: string; providerMessageId: string }
  | { kind: "rejected"; reason: string }
  | { kind: "unconfirmed" };

export type OrderEmail = {
  email: string;
  idempotencyKey: string;
  rawToken: string;
  currency: StoreCurrency;
  lines: readonly OrderLine[];
  totalMinorUnits: number;
  terms: OrderTerms;
  sentAt: Date;
};

export interface OrderDeliveryPort {
  readonly provider: string;
  createProviderIdempotencyKey(applicationIdempotencyKey: string): string;
  deliver(orderEmail: OrderEmail): Promise<OrderDeliveryResult>;
}
