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
  ProductAssetUnavailableError,
  type ProductAsset,
  type ProductAssetContent,
  type ProductAssetStore,
  type ProductAssetWriter,
} from "@eli-coach-platform/domain";

const INVALID_ASSET_KEY_MESSAGE = "Invalid product asset key.";
const UNAVAILABLE_ASSET_MESSAGE = "Product asset is unavailable.";

export class FilesystemProductAssetStore
  implements ProductAssetStore, ProductAssetWriter
{
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  assertReadyAtStartup(): void {
    try {
      if (!statSync(this.root).isDirectory()) {
        throw new Error("Store asset root is not a directory.");
      }

      accessSync(this.root, constants.R_OK | constants.W_OK);
    } catch {
      throw new Error("Store asset root is not ready.");
    }
  }

  async assertReady(): Promise<void> {
    try {
      const rootStats = await stat(this.root);

      if (!rootStats.isDirectory()) {
        throw new Error("Store asset root is not a directory.");
      }

      await access(this.root, constants.R_OK | constants.W_OK);
    } catch {
      throw new Error("Store asset root is not ready.");
    }
  }

  async write(content: ProductAssetContent): Promise<void> {
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
        throw new ProductAssetUnavailableError(UNAVAILABLE_ASSET_MESSAGE);
      }

      await assertIdenticalExistingAsset(candidatePath, content.bytes);
    } finally {
      await file?.close().catch(() => {});
    }
  }

  async openVerified(asset: ProductAsset): Promise<ReadStream> {
    const file = await this.openVerifiedAssetFile(asset);

    return file.createReadStream({ autoClose: true, start: 0 });
  }

  private async openVerifiedAssetFile(
    asset: ProductAsset,
  ): Promise<FileHandle> {
    let file: FileHandle | null = null;

    try {
      file = await this.openConfinedAssetFile(asset.assetKey);
      const assetStats = await file.stat();

      if (!assetStats.isFile() || assetStats.size !== asset.sizeBytes) {
        throw new ProductAssetUnavailableError(
          UNAVAILABLE_ASSET_MESSAGE,
        );
      }

      const digest = createHash("sha256");

      for await (const chunk of file.createReadStream({
        autoClose: false,
        start: 0,
      })) {
        digest.update(chunk);
      }

      if (digest.digest("hex") !== asset.sha256) {
        throw new ProductAssetUnavailableError(
          UNAVAILABLE_ASSET_MESSAGE,
        );
      }

      return file;
    } catch (error) {
      await file?.close().catch(() => {});

      if (
        error instanceof ProductAssetUnavailableError &&
        error.message === INVALID_ASSET_KEY_MESSAGE
      ) {
        throw error;
      }

      throw new ProductAssetUnavailableError(UNAVAILABLE_ASSET_MESSAGE);
    }
  }

  private async openConfinedAssetFile(assetKey: string): Promise<FileHandle> {
    const candidatePath = this.resolveCandidatePath(assetKey);
    let file: FileHandle | null = null;

    try {
      file = await open(candidatePath, "r");
      const [resolvedRoot, resolvedAsset, openedStats] = await Promise.all([
        realpath(this.root),
        realpath(candidatePath),
        file.stat(),
      ]);
      const resolvedStats = await stat(resolvedAsset);

      if (
        !isPathWithinRoot(resolvedRoot, resolvedAsset) ||
        openedStats.dev !== resolvedStats.dev ||
        openedStats.ino !== resolvedStats.ino
      ) {
        throw new ProductAssetUnavailableError(
          INVALID_ASSET_KEY_MESSAGE,
        );
      }

      return file;
    } catch (error) {
      await file?.close().catch(() => {});

      if (
        error instanceof ProductAssetUnavailableError &&
        error.message === INVALID_ASSET_KEY_MESSAGE
      ) {
        throw error;
      }

      throw new ProductAssetUnavailableError(UNAVAILABLE_ASSET_MESSAGE);
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
        throw new ProductAssetUnavailableError(INVALID_ASSET_KEY_MESSAGE);
      }
    } catch (error) {
      if (
        error instanceof ProductAssetUnavailableError &&
        error.message === INVALID_ASSET_KEY_MESSAGE
      ) {
        throw error;
      }

      throw new ProductAssetUnavailableError(UNAVAILABLE_ASSET_MESSAGE);
    }
  }

  private resolveCandidatePath(assetKey: string): string {
    if (!assetKey.trim() || isAbsolute(assetKey)) {
      throw new ProductAssetUnavailableError(INVALID_ASSET_KEY_MESSAGE);
    }

    const candidatePath = resolve(this.root, assetKey);

    if (!isPathWithinRoot(this.root, candidatePath)) {
      throw new ProductAssetUnavailableError(INVALID_ASSET_KEY_MESSAGE);
    }

    return candidatePath;
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EEXIST"
  );
}

async function assertIdenticalExistingAsset(
  candidatePath: string,
  bytes: Uint8Array,
): Promise<void> {
  try {
    const existingStats = await lstat(candidatePath);

    if (!existingStats.isFile()) {
      throw new ProductAssetUnavailableError(UNAVAILABLE_ASSET_MESSAGE);
    }

    const existing = await readFile(candidatePath);

    if (!existing.equals(Buffer.from(bytes))) {
      throw new ProductAssetUnavailableError(UNAVAILABLE_ASSET_MESSAGE);
    }
  } catch {
    throw new ProductAssetUnavailableError(UNAVAILABLE_ASSET_MESSAGE);
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
