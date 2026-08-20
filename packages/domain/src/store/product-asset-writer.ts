export type ProductAssetContent = {
  assetKey: string;
  bytes: Uint8Array;
};

export type ProductAssetKeyCommand = {
  extension: string;
  sha256: string;
};

export interface ProductAssetDigest {
  sha256(bytes: Uint8Array): string;
}

export interface ProductAssetWriter {
  write(content: ProductAssetContent): Promise<void>;
}

/**
 * Asset keys are content-addressed so that one key can only ever name one byte
 * sequence. The catalog enforces exactly that invariant in the database, and
 * deriving the key from the digest satisfies it by construction rather than by
 * checking after the fact. The extension comes from the format resolved by
 * inspecting the bytes, never from the customer filename.
 */
export function buildCoverAssetKey(command: ProductAssetKeyCommand): string {
  return `covers/${command.sha256}.${command.extension}`;
}

export function buildDownloadAssetKey(
  command: ProductAssetKeyCommand,
): string {
  return `products/${command.sha256}.${command.extension}`;
}
