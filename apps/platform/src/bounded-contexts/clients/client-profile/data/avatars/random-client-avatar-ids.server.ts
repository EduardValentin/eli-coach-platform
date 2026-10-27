import { randomUUID } from "node:crypto";

import type { ClientAvatarIds } from "~/bounded-contexts/clients/client-profile/domain/client-profile";

export class RandomClientAvatarIds implements ClientAvatarIds {
  generate(): string {
    return randomUUID();
  }
}
