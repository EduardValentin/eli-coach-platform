import { randomUUID } from "node:crypto";

import type { AssessmentCallIdsPort } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";

export class RandomAssessmentCallIdsAdapter implements AssessmentCallIdsPort {
  generate(): string {
    return randomUUID();
  }
}
