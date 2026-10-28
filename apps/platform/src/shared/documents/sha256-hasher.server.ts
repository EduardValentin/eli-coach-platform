import { createHash } from "node:crypto";

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function createSha256Hasher(): { hash(text: string): string } {
  return { hash: sha256Hex };
}
