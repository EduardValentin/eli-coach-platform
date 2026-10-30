import type { DownloadGrant } from "./download-grant";

export interface DownloadGrantsPort {
  findByTokenSha256(tokenSha256: string): Promise<DownloadGrant | null>;
}
