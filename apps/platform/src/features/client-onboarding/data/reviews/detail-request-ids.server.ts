import { randomUUID } from "node:crypto";

import type { DetailRequestIdGenerator } from "@eli-coach-platform/domain/client-onboarding";

export class RandomDetailRequestIds implements DetailRequestIdGenerator {
  generate(): string {
    return randomUUID();
  }
}
