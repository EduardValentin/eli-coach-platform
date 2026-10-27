import { createHash } from "node:crypto";

export function createSha256Hasher(): { hash(text: string): string } {
  return {
    hash: (text) => createHash("sha256").update(text).digest("hex"),
  };
}
