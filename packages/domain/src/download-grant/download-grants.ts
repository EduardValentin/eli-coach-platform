import type { DownloadGrant } from "./download-grant";

export interface DownloadGrants {
  findByTokenSha256(tokenSha256: string): Promise<DownloadGrant | null>;
}

export interface DownloadTokenHasher {
  sha256(rawToken: string): string;
}
