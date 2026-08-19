import { createHash } from "node:crypto";

import type { ProductAssetDigest } from "@eli-coach-platform/domain";

export class ProductAssetSha256Digest implements ProductAssetDigest {
  sha256(bytes: Uint8Array): string {
    return createHash("sha256").update(bytes).digest("hex");
  }
}
