import { randomUUID } from "node:crypto";

import type { PaymentLinkIdsPort } from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";

export class RandomPaymentLinkIdsAdapter implements PaymentLinkIdsPort {
  generate(): string {
    return randomUUID();
  }
}
