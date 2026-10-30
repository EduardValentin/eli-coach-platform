import { randomUUID } from "node:crypto";

import type { ClientIdsPort } from "~/bounded-contexts/clients/clients/domain/client";

export class RandomClientIdsAdapter implements ClientIdsPort {
  generate(): string {
    return randomUUID();
  }
}
