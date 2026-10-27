import { randomUUID } from "node:crypto";

import type { ClientIds } from "~/bounded-contexts/clients/clients/domain/client";

export class RandomClientIds implements ClientIds {
  generate(): string {
    return randomUUID();
  }
}
