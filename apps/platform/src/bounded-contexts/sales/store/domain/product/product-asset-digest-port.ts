export interface ProductAssetDigestPort {
  sha256(bytes: Uint8Array): string;
}
