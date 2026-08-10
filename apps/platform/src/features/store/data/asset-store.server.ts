import { createHash } from "node:crypto";
import {
  constants,
  accessSync,
  statSync,
  type ReadStream,
} from "node:fs";
import {
  access,
  open,
  realpath,
  stat,
  type FileHandle,
} from "node:fs/promises";
import {
  isAbsolute,
  relative,
  resolve,
} from "node:path";

import {
  ProductAssetUnavailableError,
  type ProductAsset,
  type ProductAssetStore,
} from "@eli-coach-platform/domain";

const INVALID_ASSET_KEY_MESSAGE = "Invalid product asset key.";
const UNAVAILABLE_ASSET_MESSAGE = "Product asset is unavailable.";

export class FilesystemProductAssetStore implements ProductAssetStore {
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

function isPathWithinRoot(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);

  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) &&
    !isAbsolute(relativePath)
  );
}
