import { createHash, randomBytes } from "node:crypto";

import type {
  CreateDownloadTokenResult,
  DownloadTokenHasher,
  PayloadDigestGenerator,
} from "@eli-coach-platform/domain";

export class RandomDownloadTokenGenerator {
  create(): CreateDownloadTokenResult {
    const rawToken = randomBytes(32).toString("base64url");

    return {
      rawToken,
      sha256: hashSha256(rawToken),
    };
  }
}

export class DownloadTokenSha256 implements DownloadTokenHasher {
  sha256(rawToken: string): string {
    return hashSha256(rawToken);
  }
}

export class PayloadSha256Digest implements PayloadDigestGenerator {
  digest(canonicalPayload: string): string {
    return hashSha256(canonicalPayload);
  }
}

function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
