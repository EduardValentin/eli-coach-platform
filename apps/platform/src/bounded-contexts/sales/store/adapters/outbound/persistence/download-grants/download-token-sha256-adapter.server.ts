import type { DownloadTokenHasherPort } from "~/bounded-contexts/sales/store/domain/download-grant";
import { hashSha256 } from "./hash-sha256.server";

export class DownloadTokenSha256Adapter implements DownloadTokenHasherPort {
  sha256(rawToken: string): string {
    return hashSha256(rawToken);
  }
}
