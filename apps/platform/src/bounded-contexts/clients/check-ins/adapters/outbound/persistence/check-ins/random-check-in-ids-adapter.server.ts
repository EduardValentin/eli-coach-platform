import { randomUUID } from "node:crypto";

import type { CheckInIdsPort } from "~/bounded-contexts/clients/check-ins/domain/check-in";

export class RandomCheckInIdsAdapter implements CheckInIdsPort {
  generate(): string {
    return randomUUID();
  }
}
