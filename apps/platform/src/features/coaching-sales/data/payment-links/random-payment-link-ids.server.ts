import { randomUUID } from "node:crypto";

import type { PaymentLinkIds } from "@eli-coach-platform/domain/payment-link";

export class RandomPaymentLinkIds implements PaymentLinkIds {
  generate(): string {
    return randomUUID();
  }
}
