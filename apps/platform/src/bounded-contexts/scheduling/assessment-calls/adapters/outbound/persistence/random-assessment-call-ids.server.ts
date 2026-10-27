import { randomUUID } from "node:crypto";

import type { AssessmentCallIds } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";

export class RandomAssessmentCallIds implements AssessmentCallIds {
  generate(): string {
    return randomUUID();
  }
}
