import { randomBytes } from "node:crypto";

import type { CreateDownloadTokenResult } from "~/bounded-contexts/sales/store/domain/acquisition";
import { hashSha256 } from "./hash-sha256.server";

export class RandomDownloadTokenGeneratorAdapter {
  create(): CreateDownloadTokenResult {
    const rawToken = randomBytes(32).toString("base64url");

    return {
      rawToken,
      sha256: hashSha256(rawToken),
    };
  }
}
