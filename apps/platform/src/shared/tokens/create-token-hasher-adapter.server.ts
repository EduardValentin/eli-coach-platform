import { Sha256TokenHasherAdapter } from "./sha256-token-hasher-adapter.server";
import type { TokenHasherPort } from "./token-hasher-port.server";

export function createTokenHasherAdapter(): TokenHasherPort {
  return new Sha256TokenHasherAdapter();
}
