import { randomUUID } from "node:crypto";

import type { DetailRequestIds } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";

export class RandomDetailRequestIds implements DetailRequestIds {
  generate(): string {
    return randomUUID();
  }
}
