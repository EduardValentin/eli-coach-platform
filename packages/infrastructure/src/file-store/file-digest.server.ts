import { createHash } from "node:crypto";

import type { StoredFileDigest } from "@eli-coach-platform/domain";

export class Sha256FileDigest implements StoredFileDigest {
  sha256(bytes: Uint8Array): string {
    return createHash("sha256").update(bytes).digest("hex");
  }
}
