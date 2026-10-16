import { randomUUID } from "node:crypto";

import type { DetailRequestIds } from "@eli-coach-platform/domain/client-onboarding";

export class RandomDetailRequestIds implements DetailRequestIds {
  generate(): string {
    return randomUUID();
  }
}
