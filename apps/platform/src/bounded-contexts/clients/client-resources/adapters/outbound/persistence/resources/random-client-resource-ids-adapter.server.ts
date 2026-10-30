import { randomUUID } from "node:crypto";

import type { ClientResourceIdsPort } from "~/bounded-contexts/clients/client-resources/domain/client-resources";

export class RandomClientResourceIdsAdapter implements ClientResourceIdsPort {
  generate(): string {
    return randomUUID();
  }
}
