import { randomUUID } from "node:crypto";

import type { PaymentLinkIdsPort } from "~/bounded-contexts/sales/subscriptions/domain/payment-link";

export class RandomPaymentLinkIdsAdapter implements PaymentLinkIdsPort {
  generate(): string {
    return randomUUID();
  }
}
