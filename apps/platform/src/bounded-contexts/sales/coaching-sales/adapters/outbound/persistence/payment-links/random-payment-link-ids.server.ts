import { randomUUID } from "node:crypto";

import type { PaymentLinkIds } from "~/bounded-contexts/sales/coaching-sales/domain/payment-link";

export class RandomPaymentLinkIds implements PaymentLinkIds {
  generate(): string {
    return randomUUID();
  }
}
