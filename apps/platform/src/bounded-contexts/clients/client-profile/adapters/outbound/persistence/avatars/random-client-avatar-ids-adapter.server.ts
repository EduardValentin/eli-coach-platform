import { randomUUID } from "node:crypto";

import type { ClientAvatarIdsPort } from "~/bounded-contexts/clients/client-profile/domain/client-profile";

export class RandomClientAvatarIdsAdapter implements ClientAvatarIdsPort {
  generate(): string {
    return randomUUID();
  }
}
