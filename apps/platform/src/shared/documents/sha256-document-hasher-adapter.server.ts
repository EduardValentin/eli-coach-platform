import { sha256Hex } from "./sha256-hasher.server";

export class Sha256DocumentHasherAdapter {
  hash(text: string): string {
    return sha256Hex(text);
  }
}
