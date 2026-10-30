import { sha256Hex } from "~/shared/documents/sha256-hasher.server";
import type { TokenHasherPort } from "./token-hasher-port.server";

export class Sha256TokenHasherAdapter implements TokenHasherPort {
  sha256(rawToken: string): string {
    return sha256Hex(rawToken);
  }
}
