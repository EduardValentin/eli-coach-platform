import { randomUUID } from "node:crypto";

import type { ProgressPhotoIdGenerator } from "@eli-coach-platform/domain/client-profile";

export class RandomProgressPhotoIds implements ProgressPhotoIdGenerator {
  generate(): string {
    return randomUUID();
  }
}
