import { createHash, randomBytes } from "node:crypto";

import type {
  ClientOnboardingPayloadDigestGenerator,
  InvitationTokenGenerator,
  InvitationTokenHasher,
} from "@eli-coach-platform/domain";

// 32 bytes leaves the token far beyond guessing, and base64url keeps it safe to
// carry in the invitation link without escaping.
export class RandomInvitationTokenGenerator implements InvitationTokenGenerator {
  generateToken(): string {
    return randomBytes(32).toString("base64url");
  }
}

export class InvitationTokenSha256 implements InvitationTokenHasher {
  hashToken(token: string): string {
    return hashSha256(token);
  }
}

export class InvitationPayloadSha256Digest
  implements ClientOnboardingPayloadDigestGenerator
{
  digestPayload(payload: string): string {
    return hashSha256(payload);
  }
}

function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
