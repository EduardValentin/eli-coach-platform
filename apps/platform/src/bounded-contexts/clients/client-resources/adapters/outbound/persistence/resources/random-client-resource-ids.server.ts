import { randomUUID } from "node:crypto";

import type { ClientResourceIds } from "~/bounded-contexts/clients/client-resources/domain/client-resources";

export class RandomClientResourceIds implements ClientResourceIds {
  generate(): string {
    return randomUUID();
  }
}
