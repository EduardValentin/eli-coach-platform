import { randomUUID } from "node:crypto";

import type { MeasurementIdsPort } from "~/bounded-contexts/clients/client-profile/domain/measurement";

export class RandomMeasurementIdsAdapter implements MeasurementIdsPort {
  generate(): string {
    return randomUUID();
  }
}
