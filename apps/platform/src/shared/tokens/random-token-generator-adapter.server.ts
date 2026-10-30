import { randomBytes } from "node:crypto";
import { sha256Hex } from "~/shared/documents/sha256-hasher.server";
import type { TokenGeneratorPort } from "./token-generator-port.server";

export class RandomTokenGeneratorAdapter implements TokenGeneratorPort {
  create(): { rawToken: string; sha256: string } {
    const rawToken = randomBytes(TOKEN_BYTES).toString("base64url");

    return { rawToken, sha256: sha256Hex(rawToken) };
  }
}

const TOKEN_BYTES = 32;
