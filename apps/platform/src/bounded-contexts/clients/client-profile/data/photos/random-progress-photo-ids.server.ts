import { randomUUID } from "node:crypto";

import type { ProgressPhotoIds } from "@eli-coach-platform/domain/client-profile";

export class RandomProgressPhotoIds implements ProgressPhotoIds {
  generate(): string {
    return randomUUID();
  }
}
