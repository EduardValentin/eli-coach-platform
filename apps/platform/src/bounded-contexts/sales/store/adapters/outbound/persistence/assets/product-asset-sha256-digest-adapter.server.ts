import { createHash } from "node:crypto";

import type { ProductAssetDigestPort } from "~/bounded-contexts/sales/store/domain/product";

export class ProductAssetSha256DigestAdapter implements ProductAssetDigestPort {
  sha256(bytes: Uint8Array): string {
    return createHash("sha256").update(bytes).digest("hex");
  }
}
