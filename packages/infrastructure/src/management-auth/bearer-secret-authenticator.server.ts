import { timingSafeEqual } from "node:crypto";

import type {
  ManagementAuthenticationResult,
  ManagementAuthenticator,
} from "./management-auth-contract.server";

const BEARER_SCHEME = "bearer";

type BearerSecretManagementAuthenticatorOptions = {
  principalId: string;
  secret: string;
};

export class BearerSecretManagementAuthenticator
  implements ManagementAuthenticator
{
  private readonly principalId: string;
  private readonly secret: Buffer;

  constructor(options: BearerSecretManagementAuthenticatorOptions) {
    this.principalId = options.principalId;
    this.secret = Buffer.from(options.secret, "utf8");
  }

  async authenticate(
    request: Request,
  ): Promise<ManagementAuthenticationResult> {
    const presented = readBearerCredential(
      request.headers.get("authorization"),
    );

    if (!presented || !this.matchesSecret(presented)) {
      return { status: "unauthenticated" };
    }

    return {
      status: "authenticated",
      principal: { kind: "machine", id: this.principalId },
    };
  }

  private matchesSecret(presented: string): boolean {
    const candidate = Buffer.from(presented, "utf8");

    /**
     * `timingSafeEqual` throws on a length mismatch, and the length of the
     * configured secret is not itself a secret worth protecting, so comparing
     * lengths first is safe and keeps the comparison constant-time over every
     * candidate that could actually match.
     */
    return (
      candidate.length === this.secret.length &&
      timingSafeEqual(candidate, this.secret)
    );
  }
}

function readBearerCredential(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const separatorIndex = header.indexOf(" ");

  if (separatorIndex <= 0) {
    return null;
  }

  const scheme = header.slice(0, separatorIndex);

  if (scheme.toLowerCase() !== BEARER_SCHEME) {
    return null;
  }

  return header.slice(separatorIndex + 1).trim() || null;
}
