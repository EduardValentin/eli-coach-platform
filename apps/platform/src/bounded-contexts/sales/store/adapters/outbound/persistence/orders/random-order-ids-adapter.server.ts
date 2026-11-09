import { randomUUID } from "node:crypto";

import type { OrderIdsPort } from "~/bounded-contexts/sales/store/domain/order";

export class RandomOrderIdsAdapter implements OrderIdsPort {
  generate(): string {
    return randomUUID();
  }
}
