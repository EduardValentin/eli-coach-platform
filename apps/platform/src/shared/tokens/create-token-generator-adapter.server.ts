import type { TokenGeneratorPort } from "./token-generator-port.server";
import { RandomTokenGeneratorAdapter } from "./random-token-generator-adapter.server";

export function createTokenGeneratorAdapter(): TokenGeneratorPort {
  return new RandomTokenGeneratorAdapter();
}
