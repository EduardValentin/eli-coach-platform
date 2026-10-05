import { randomUUID } from "node:crypto";

import type { ClientResourceIds } from "@eli-coach-platform/domain/client-resources";

export class RandomClientResourceIds implements ClientResourceIds {
  generate(): string {
    return randomUUID();
  }
}
