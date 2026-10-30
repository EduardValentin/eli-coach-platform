import { randomUUID } from "node:crypto";

import type { ProgressPhotoIdsPort } from "~/bounded-contexts/clients/client-profile/domain/client-profile";

export class RandomProgressPhotoIdsAdapter implements ProgressPhotoIdsPort {
  generate(): string {
    return randomUUID();
  }
}
