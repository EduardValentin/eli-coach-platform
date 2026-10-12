import { createHash, randomBytes } from "node:crypto";

import type {
  InvitationTokenGenerator,
  InvitationTokenHasher,
} from "@eli-coach-platform/domain/client-invitation";
import type {
  PaymentLinkTokenGenerator,
  PaymentLinkTokenHasher,
} from "@eli-coach-platform/domain/payment-link";

const TOKEN_BYTES = 32;

type LinkTokens = {
  generator: PaymentLinkTokenGenerator & InvitationTokenGenerator;
  hasher: PaymentLinkTokenHasher & InvitationTokenHasher;
};

class RandomLinkTokenGenerator
  implements PaymentLinkTokenGenerator, InvitationTokenGenerator
{
  create(): { rawToken: string; sha256: string } {
    const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");

    return { rawToken, sha256: hashSha256(rawToken) };
  }
}

class LinkTokenSha256 implements PaymentLinkTokenHasher, InvitationTokenHasher {
  sha256(rawToken: string): string {
    return hashSha256(rawToken);
  }
}

function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createLinkTokens(): LinkTokens {
  return {
    generator: new RandomLinkTokenGenerator(),
    hasher: new LinkTokenSha256(),
  };
}
