import type {
  StoredFileContent,
  StoredFileDigest,
  StoredFileWriter,
} from "../stored-files";

export type ProductAssetContent = StoredFileContent;
export type ProductAssetDigest = StoredFileDigest;
export type ProductAssetWriter = StoredFileWriter;

export type ProductAssetKeyCommand = {
  extension: string;
  sha256: string;
};

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
