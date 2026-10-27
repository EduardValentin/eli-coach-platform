import { randomUUID } from "node:crypto";

import type { ClientIds } from "@eli-coach-platform/domain/client";

export class RandomClientIds implements ClientIds {
  generate(): string {
    return randomUUID();
  }
}
