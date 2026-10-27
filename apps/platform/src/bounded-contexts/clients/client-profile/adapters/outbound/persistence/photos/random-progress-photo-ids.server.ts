import { randomUUID } from "node:crypto";

import type { ProgressPhotoIds } from "~/bounded-contexts/clients/client-profile/domain/client-profile";

export class RandomProgressPhotoIds implements ProgressPhotoIds {
  generate(): string {
    return randomUUID();
  }
}
