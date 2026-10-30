import { randomUUID } from "node:crypto";

import type { DetailRequestIdsPort } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";

export class RandomDetailRequestIdsAdapter implements DetailRequestIdsPort {
  generate(): string {
    return randomUUID();
  }
}
