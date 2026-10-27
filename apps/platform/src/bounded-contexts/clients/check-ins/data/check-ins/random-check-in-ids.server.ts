import { randomUUID } from "node:crypto";

import type { CheckInIds } from "@eli-coach-platform/domain/check-in";

export class RandomCheckInIds implements CheckInIds {
  generate(): string {
    return randomUUID();
  }
}
