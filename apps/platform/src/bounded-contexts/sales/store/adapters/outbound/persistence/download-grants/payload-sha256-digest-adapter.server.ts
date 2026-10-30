import type { PayloadDigestGeneratorPort } from "~/bounded-contexts/sales/store/domain/acquisition";
import { hashSha256 } from "./hash-sha256.server";

export class PayloadSha256DigestAdapter implements PayloadDigestGeneratorPort {
  digest(canonicalPayload: string): string {
    return hashSha256(canonicalPayload);
  }
}
