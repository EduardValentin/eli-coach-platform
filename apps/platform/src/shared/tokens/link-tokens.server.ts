import type { TokenGeneratorPort } from "./token-generator-port.server";
import type { TokenHasherPort } from "./token-hasher-port.server";
import { RandomTokenGeneratorAdapter } from "./random-token-generator-adapter.server";
import { Sha256TokenHasherAdapter } from "./sha256-token-hasher-adapter.server";

export function createTokenGenerator(): TokenGeneratorPort {
  return new RandomTokenGeneratorAdapter();
}

export function createTokenHasher(): TokenHasherPort {
  return new Sha256TokenHasherAdapter();
}
