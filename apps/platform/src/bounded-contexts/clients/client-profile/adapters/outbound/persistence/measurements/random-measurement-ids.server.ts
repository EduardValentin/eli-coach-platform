import { randomUUID } from "node:crypto";

import type { MeasurementIds } from "~/bounded-contexts/clients/client-profile/domain/measurement";

export class RandomMeasurementIds implements MeasurementIds {
  generate(): string {
    return randomUUID();
  }
}
