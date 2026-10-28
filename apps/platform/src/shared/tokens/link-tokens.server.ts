import { randomBytes } from "node:crypto";

import { sha256Hex } from "~/shared/documents/sha256-hasher.server";

const TOKEN_BYTES = 32;

type TokenGenerator = { create(): { rawToken: string; sha256: string } };

type TokenHasher = { sha256(rawToken: string): string };

class RandomTokenGenerator implements TokenGenerator {
  create(): { rawToken: string; sha256: string } {
    const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");

    return { rawToken, sha256: sha256Hex(rawToken) };
  }
}

class Sha256TokenHasher implements TokenHasher {
  sha256(rawToken: string): string {
    return sha256Hex(rawToken);
  }
}

export function createTokenGenerator(): TokenGenerator {
  return new RandomTokenGenerator();
}

export function createTokenHasher(): TokenHasher {
  return new Sha256TokenHasher();
}
