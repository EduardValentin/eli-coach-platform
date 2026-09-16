import { createHash } from "node:crypto";
import {
  constants,
  accessSync,
  statSync,
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

import type { ProductAsset, ProductAssetContent, ProductAssetOpenResult, ProductAssetStore, ProductAssetWriter } from "@eli-coach-platform/domain/store";

const INVALID_ASSET_KEY_MESSAGE = "Invalid product asset key.";
const UNAVAILABLE_ASSET_MESSAGE = "Product asset is unavailable.";

type ResolvedAssetPath =
  | { kind: "resolved"; path: string }
  | { kind: "unavailable" };

type OpenedAssetFile =
  | { kind: "opened"; file: FileHandle }
  | { kind: "unavailable" };

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
    const candidate = this.resolveCandidatePath(content.assetKey);

    if (candidate.kind === "unavailable") {
      throw new Error(INVALID_ASSET_KEY_MESSAGE);
    }

    await mkdir(dirname(candidate.path), { recursive: true });
    await this.assertConfinedDirectory(dirname(candidate.path));

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
      file = await open(candidate.path, "wx");

      await file.writeFile(content.bytes);
      await file.sync();
    } catch (error) {
      if (!isAlreadyExistsError(error)) {
        throw new Error(UNAVAILABLE_ASSET_MESSAGE);
      }

      await assertIdenticalExistingAsset(candidate.path, content.bytes);
    } finally {
      await file?.close().catch(() => {});
    }
  }

  async openVerified(asset: ProductAsset): Promise<ProductAssetOpenResult> {
    const opened = await this.openVerifiedAssetFile(asset);

    if (opened.kind === "unavailable") {
      return { kind: "unavailable" };
    }

    return {
      kind: "opened",
      bytes: opened.file.createReadStream({ autoClose: true, start: 0 }),
    };
  }

  private async openVerifiedAssetFile(
    asset: ProductAsset,
  ): Promise<OpenedAssetFile> {
    const opened = await this.openConfinedAssetFile(asset.assetKey);

    if (opened.kind === "unavailable") {
      return { kind: "unavailable" };
    }

    const file = opened.file;

    try {
      const assetStats = await file.stat();

      if (!assetStats.isFile() || assetStats.size !== asset.sizeBytes) {
        await file.close();

        return { kind: "unavailable" };
      }

      const digest = createHash("sha256");

      for await (const chunk of file.createReadStream({
        autoClose: false,
        start: 0,
      })) {
        digest.update(chunk);
      }

      if (digest.digest("hex") !== asset.sha256) {
        await file.close();

        return { kind: "unavailable" };
      }

      return { kind: "opened", file };
    } catch (error) {
      await file.close().catch(() => {});

      throw error;
    }
  }

  private async openConfinedAssetFile(
    assetKey: string,
  ): Promise<OpenedAssetFile> {
    const candidate = this.resolveCandidatePath(assetKey);

    if (candidate.kind === "unavailable") {
      return { kind: "unavailable" };
    }

    let file: FileHandle;

    /**
     * A key with no file behind it is a definitive answer rather than an
     * infrastructure failure, and the file system only ever reports it as a
     * thrown `ENOENT`. Every other error still propagates.
     */
    try {
      file = await open(candidate.path, "r");
    } catch (error) {
      if (isMissingFileError(error)) {
        return { kind: "unavailable" };
      }

      throw error;
    }

    try {
      const [resolvedRoot, resolvedAsset, openedStats] = await Promise.all([
        realpath(this.root),
        realpath(candidate.path),
        file.stat(),
      ]);
      const resolvedStats = await stat(resolvedAsset);

      if (
        !isPathWithinRoot(resolvedRoot, resolvedAsset) ||
        openedStats.dev !== resolvedStats.dev ||
        openedStats.ino !== resolvedStats.ino
      ) {
        await file.close();

        return { kind: "unavailable" };
      }

      return { kind: "opened", file };
    } catch (error) {
      await file.close().catch(() => {});

      if (isMissingFileError(error)) {
        return { kind: "unavailable" };
      }

      throw error;
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
    const [resolvedRoot, resolvedDirectory] = await Promise.all([
      realpath(this.root),
      realpath(directoryPath),
    ]);

    if (
      resolvedDirectory !== resolvedRoot &&
      !isPathWithinRoot(resolvedRoot, resolvedDirectory)
    ) {
      throw new Error(INVALID_ASSET_KEY_MESSAGE);
    }
  }

  private resolveCandidatePath(assetKey: string): ResolvedAssetPath {
    if (!assetKey.trim() || isAbsolute(assetKey)) {
      return { kind: "unavailable" };
    }

    const candidatePath = resolve(this.root, assetKey);

    if (!isPathWithinRoot(this.root, candidatePath)) {
      return { kind: "unavailable" };
    }

    return { kind: "resolved", path: candidatePath };
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  return hasErrorCode(error, "EEXIST");
}

function isMissingFileError(error: unknown): boolean {
  return hasErrorCode(error, "ENOENT");
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

async function assertIdenticalExistingAsset(
  candidatePath: string,
  bytes: Uint8Array,
): Promise<void> {
  try {
    const existingStats = await lstat(candidatePath);

    if (!existingStats.isFile()) {
      throw new Error(UNAVAILABLE_ASSET_MESSAGE);
    }

    const existing = await readFile(candidatePath);

    if (!existing.equals(Buffer.from(bytes))) {
      throw new Error(UNAVAILABLE_ASSET_MESSAGE);
    }
  } catch {
    throw new Error(UNAVAILABLE_ASSET_MESSAGE);
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
