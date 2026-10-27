import { randomUUID } from "node:crypto";

import type { AssessmentCallIds } from "@eli-coach-platform/domain/assessment-call";

export class RandomAssessmentCallIds implements AssessmentCallIds {
  generate(): string {
    return randomUUID();
  }
}
