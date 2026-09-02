export type StoredFileContent = {
  assetKey: string;
  bytes: Uint8Array;
};

export type StoredFileDescriptor = {
  assetKey: string;
  sizeBytes: number;
  sha256: string;
};

/** Inclusive byte offsets, the way an HTTP Range header states them. */
export type StoredFileByteRange = {
  start: number;
  end: number;
};

export class StoredFileUnavailableError extends Error {
  constructor(message = "Stored file is unavailable.") {
    super(message);
    this.name = "StoredFileUnavailableError";
  }
}

export interface StoredFileDigest {
  sha256(bytes: Uint8Array): string;
}

export interface StoredFileWriter {
  write(content: StoredFileContent): Promise<void>;
}

/**
 * Reads that prove the bytes on disk are the bytes that were recorded: size
 * and digest are checked before a stream is handed out.
 */
export interface VerifiedFileReader {
  assertReady(): Promise<void>;
  openVerified(file: StoredFileDescriptor): Promise<NodeJS.ReadableStream>;
}

/**
 * Reads for media a browser fetches piecemeal. Only the size is checked: the
 * key is the digest of the content, so a file at that key with the recorded
 * size is the file that was written.
 */
export interface RangeFileReader {
  open(
    file: StoredFileDescriptor,
    range?: StoredFileByteRange,
  ): Promise<NodeJS.ReadableStream>;
}
