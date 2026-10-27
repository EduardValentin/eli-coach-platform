import { randomUUID } from "node:crypto";

import type { CheckInIds } from "~/bounded-contexts/clients/check-ins/domain/check-in";

export class RandomCheckInIds implements CheckInIds {
  generate(): string {
    return randomUUID();
  }
}
