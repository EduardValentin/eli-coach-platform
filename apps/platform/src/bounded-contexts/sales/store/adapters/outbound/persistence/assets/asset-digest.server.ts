import { createHash } from "node:crypto";

import type { ProductAssetDigest } from "~/bounded-contexts/sales/store/domain/product";

export class ProductAssetSha256Digest implements ProductAssetDigest {
  sha256(bytes: Uint8Array): string {
    return createHash("sha256").update(bytes).digest("hex");
  }
}
