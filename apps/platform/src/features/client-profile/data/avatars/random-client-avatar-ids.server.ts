import { randomUUID } from "node:crypto";

import type { ClientAvatarIds } from "@eli-coach-platform/domain/client-profile";

export class RandomClientAvatarIds implements ClientAvatarIds {
  generate(): string {
    return randomUUID();
  }
}
