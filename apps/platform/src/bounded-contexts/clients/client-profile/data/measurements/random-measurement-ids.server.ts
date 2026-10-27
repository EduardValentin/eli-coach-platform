import { randomUUID } from "node:crypto";

import type { MeasurementIds } from "@eli-coach-platform/domain/measurement";

export class RandomMeasurementIds implements MeasurementIds {
  generate(): string {
    return randomUUID();
  }
}
