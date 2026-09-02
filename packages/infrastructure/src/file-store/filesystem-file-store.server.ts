import { createHash } from "node:crypto";
import {
  constants,
  accessSync,
  statSync,
  type ReadStream,
} from "node:fs";
import {
  access,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  stat,
  type FileHandle,
} from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
} from "node:path";

import {
  StoredFileUnavailableError,
  type RangeFileReader,
  type StoredFileByteRange,
  type StoredFileContent,
  type StoredFileDescriptor,
  type StoredFileWriter,
  type VerifiedFileReader,
} from "@eli-coach-platform/domain";

const INVALID_KEY_MESSAGE = "Invalid asset key.";
const UNAVAILABLE_MESSAGE = "Stored file is unavailable.";
const INVALID_RANGE_MESSAGE = "Invalid byte range.";

/**
 * One content-addressed directory shared by every feature that keeps files:
 * store covers and downloads, exercise demonstration videos. Keys are relative
 * paths whose leaf is the digest of the bytes, so a key can only ever name one
 * byte sequence and identical uploads dedupe by construction.
 */
export class FilesystemFileStore
  implements StoredFileWriter, VerifiedFileReader, RangeFileReader
{
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  assertReadyAtStartup(): void {
    try {
      if (!statSync(this.root).isDirectory()) {
        throw new Error("Asset root is not a directory.");
      }

      accessSync(this.root, constants.R_OK | constants.W_OK);
    } catch {
      throw new Error("Asset root is not ready.");
    }
  }

  async assertReady(): Promise<void> {
    try {
      const rootStats = await stat(this.root);

      if (!rootStats.isDirectory()) {
        throw new Error("Asset root is not a directory.");
      }

      await access(this.root, constants.R_OK | constants.W_OK);
    } catch {
      throw new Error("Asset root is not ready.");
    }
  }

  async write(content: StoredFileContent): Promise<void> {
    const candidatePath = this.resolveCandidatePath(content.assetKey);

    await mkdir(dirname(candidatePath), { recursive: true });
    await this.assertConfinedDirectory(dirname(candidatePath));

    let file: FileHandle | null = null;

    try {
      /**
       * `wx` fails rather than following a symlink planted at the key, so a
       * link at the leaf cannot redirect the write. A link at a *directory*
       * segment would not be caught here at all — `mkdir` walks straight
       * through one — which is why the containment check above resolves the
       * real directory first. The existing-file branch below then treats only a
       * byte-identical regular file as an idempotent republish.
       */
      file = await open(candidatePath, "wx");

      await file.writeFile(content.bytes);
      await file.sync();
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
      }

      await assertIdenticalExistingFile(candidatePath, content.bytes);
    } finally {
      await file?.close().catch(() => {});
    }
  }

  async openVerified(file: StoredFileDescriptor): Promise<ReadStream> {
    const handle = await this.openVerifiedFile(file);

    return handle.createReadStream({ autoClose: true, start: 0 });
  }

  /**
   * Skips the digest that `openVerified` recomputes: a video is fetched in
   * many small ranges, and hashing tens of megabytes on each one would cost
   * more than it protects. The size check still catches a truncated or
   * swapped file, and the key already binds the path to its content.
   */
  async open(
    file: StoredFileDescriptor,
    range?: StoredFileByteRange,
  ): Promise<ReadStream> {
    const handle = await this.openConfinedFile(file.assetKey);

    try {
      const stats = await handle.stat();

      if (!stats.isFile() || stats.size !== file.sizeBytes) {
        throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
      }

      if (range && !isWithinFile(range, file.sizeBytes)) {
        throw new StoredFileUnavailableError(INVALID_RANGE_MESSAGE);
      }

      return handle.createReadStream({
        autoClose: true,
        end: range?.end,
        start: range?.start ?? 0,
      });
    } catch (error) {
      await handle.close().catch(() => {});

      if (error instanceof StoredFileUnavailableError) {
        throw error;
      }

      throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
    }
  }

  private async openVerifiedFile(
    file: StoredFileDescriptor,
  ): Promise<FileHandle> {
    let handle: FileHandle | null = null;

    try {
      handle = await this.openConfinedFile(file.assetKey);
      const fileStats = await handle.stat();

      if (!fileStats.isFile() || fileStats.size !== file.sizeBytes) {
        throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
      }

      const digest = createHash("sha256");

      for await (const chunk of handle.createReadStream({
        autoClose: false,
        start: 0,
      })) {
        digest.update(chunk);
      }

      if (digest.digest("hex") !== file.sha256) {
        throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
      }

      return handle;
    } catch (error) {
      await handle?.close().catch(() => {});

      if (
        error instanceof StoredFileUnavailableError &&
        error.message === INVALID_KEY_MESSAGE
      ) {
        throw error;
      }

      throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
    }
  }

  private async openConfinedFile(assetKey: string): Promise<FileHandle> {
    const candidatePath = this.resolveCandidatePath(assetKey);
    let handle: FileHandle | null = null;

    try {
      handle = await open(candidatePath, "r");
      const [resolvedRoot, resolvedFile, openedStats] = await Promise.all([
        realpath(this.root),
        realpath(candidatePath),
        handle.stat(),
      ]);
      const resolvedStats = await stat(resolvedFile);

      if (
        !isPathWithinRoot(resolvedRoot, resolvedFile) ||
        openedStats.dev !== resolvedStats.dev ||
        openedStats.ino !== resolvedStats.ino
      ) {
        throw new StoredFileUnavailableError(INVALID_KEY_MESSAGE);
      }

      return handle;
    } catch (error) {
      await handle?.close().catch(() => {});

      if (
        error instanceof StoredFileUnavailableError &&
        error.message === INVALID_KEY_MESSAGE
      ) {
        throw error;
      }

      throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
    }
  }

  /**
   * `resolveCandidatePath` only proves the key is lexically inside the root.
   * That is not enough for a write: if a directory segment under the root is a
   * symlink, `mkdir` follows it and the file lands outside. Resolving the real
   * directory after creating it is what actually confines the write, and
   * mirrors the `realpath` check the read path already performs.
   */
  private async assertConfinedDirectory(directoryPath: string): Promise<void> {
    try {
      const [resolvedRoot, resolvedDirectory] = await Promise.all([
        realpath(this.root),
        realpath(directoryPath),
      ]);

      if (
        resolvedDirectory !== resolvedRoot &&
        !isPathWithinRoot(resolvedRoot, resolvedDirectory)
      ) {
        throw new StoredFileUnavailableError(INVALID_KEY_MESSAGE);
      }
    } catch (error) {
      if (
        error instanceof StoredFileUnavailableError &&
        error.message === INVALID_KEY_MESSAGE
      ) {
        throw error;
      }

      throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
    }
  }

  private resolveCandidatePath(assetKey: string): string {
    if (!assetKey.trim() || isAbsolute(assetKey)) {
      throw new StoredFileUnavailableError(INVALID_KEY_MESSAGE);
    }

    const candidatePath = resolve(this.root, assetKey);

    if (!isPathWithinRoot(this.root, candidatePath)) {
      throw new StoredFileUnavailableError(INVALID_KEY_MESSAGE);
    }

    return candidatePath;
  }
}

function isWithinFile(range: StoredFileByteRange, sizeBytes: number): boolean {
  return (
    Number.isInteger(range.start) &&
    Number.isInteger(range.end) &&
    range.start >= 0 &&
    range.end >= range.start &&
    range.end < sizeBytes
  );
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EEXIST"
  );
}

async function assertIdenticalExistingFile(
  candidatePath: string,
  bytes: Uint8Array,
): Promise<void> {
  try {
    const existingStats = await lstat(candidatePath);

    if (!existingStats.isFile()) {
      throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
    }

    const existing = await readFile(candidatePath);

    if (!existing.equals(Buffer.from(bytes))) {
      throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
    }
  } catch {
    throw new StoredFileUnavailableError(UNAVAILABLE_MESSAGE);
  }
}

function isPathWithinRoot(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);

  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) &&
    !isAbsolute(relativePath)
  );
}
