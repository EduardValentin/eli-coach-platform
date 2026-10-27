import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

type TokenGenerator = { create(): { rawToken: string; sha256: string } };

type TokenHasher = { sha256(rawToken: string): string };

class RandomTokenGenerator implements TokenGenerator {
  create(): { rawToken: string; sha256: string } {
    const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");

    return { rawToken, sha256: hashSha256(rawToken) };
  }
}

class Sha256TokenHasher implements TokenHasher {
  sha256(rawToken: string): string {
    return hashSha256(rawToken);
  }
}

function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createTokenGenerator(): TokenGenerator {
  return new RandomTokenGenerator();
}

export function createTokenHasher(): TokenHasher {
  return new Sha256TokenHasher();
}
