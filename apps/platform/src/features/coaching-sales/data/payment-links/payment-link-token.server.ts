import { createHash, randomBytes } from "node:crypto";

import type {
  PaymentLinkTokenGenerator,
  PaymentLinkTokenHasher,
} from "@eli-coach-platform/domain/payment-link";

const TOKEN_BYTES = 32;

export class RandomPaymentLinkTokenGenerator implements PaymentLinkTokenGenerator {
  create(): { rawToken: string; sha256: string } {
    const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");

    return { rawToken, sha256: hashSha256(rawToken) };
  }
}

export class PaymentLinkTokenSha256 implements PaymentLinkTokenHasher {
  sha256(rawToken: string): string {
    return hashSha256(rawToken);
  }
}

function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
