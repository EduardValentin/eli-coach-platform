import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

import type { DownloadGrant, ProductAsset, ProductAssetOpenResult, ProductAssets } from "@eli-coach-platform/domain/store";
import { ZipArchive } from "archiver";

export class ZipDeliveryStream {
  constructor(private readonly assetStore: ProductAssets) {}

  async create(grant: DownloadGrant): Promise<ProductAssetOpenResult> {
    const grantEntries = planGrantEntries(grant);

    if (grantEntries.kind === "unavailable") {
      return { kind: "unavailable" };
    }

    const openedEntries: {
      entryName: string;
      stream: Readable;
    }[] = [];

    try {
      for (const { asset, entryName } of grantEntries.entries) {
        const opened = await this.assetStore.openVerified(asset);

        if (opened.kind === "unavailable") {
          closeStreams(openedEntries);

          return { kind: "unavailable" };
        }

        openedEntries.push({
          entryName,
          stream: Readable.from(opened.bytes),
        });
      }
    } catch (error) {
      closeStreams(openedEntries);

      throw error;
    }

    const archive = new ZipArchive({
      zlib: { level: 9 },
    });
    const closeOpenedStreams = createCloseStreamsOnce(openedEntries);

    archive.once("close", closeOpenedStreams);
    archive.once("end", closeOpenedStreams);
    archive.once("error", closeOpenedStreams);
    void appendAssetsSequentially({
      archive,
      closeOpenedStreams,
      openedEntries,
    });

    return { kind: "opened", bytes: archive };
  }
}

type GrantEntryPlan =
  | {
      kind: "planned";
      entries: readonly { asset: ProductAsset; entryName: string }[];
    }
  | { kind: "unavailable" };

function planGrantEntries(grant: DownloadGrant): GrantEntryPlan {
  const entries: { asset: ProductAsset; entryName: string }[] = [];

  for (const item of grant.items) {
    for (const asset of item.assets) {
      const entryName = createEntryName(item.productSlug, asset);

      if (entryName === null) {
        return { kind: "unavailable" };
      }

      entries.push({ asset, entryName });
    }
  }

  return { kind: "planned", entries };
}

async function appendAssetsSequentially(options: {
  archive: ZipArchive;
  closeOpenedStreams: () => void;
  openedEntries: readonly {
    entryName: string;
    stream: Readable;
  }[];
}): Promise<void> {
  try {
    for (const { entryName, stream } of options.openedEntries) {
      const streamCompleted = finished(stream, {
        cleanup: true,
        readable: true,
        writable: false,
      });

      options.archive.append(stream, { name: entryName });
      await streamCompleted;
    }

    await options.archive.finalize();
  } catch (error) {
    options.closeOpenedStreams();
    options.archive.destroy(asError(error));
  }
}

function createCloseStreamsOnce(
  entries: readonly { stream: Readable }[],
): () => void {
  let closed = false;

  return () => {
    if (closed) {
      return;
    }

    closed = true;
    closeStreams(entries);
  };
}

function closeStreams(
  entries: readonly { stream: Readable }[],
): void {
  for (const { stream } of entries) {
    if (!stream.destroyed) {
      stream.destroy();
    }
  }
}

function createEntryName(
  productSlug: string,
  asset: ProductAsset,
): string | null {
  const slugSegment = toSafeZipEntrySegment(productSlug);
  const filenameSegment = toSafeZipEntrySegment(asset.customerFilename);

  if (slugSegment === null || filenameSegment === null) {
    return null;
  }

  return `${slugSegment}/${filenameSegment}`;
}

function asError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("A granted product asset could not be streamed.");
}

function toSafeZipEntrySegment(value: string): string | null {
  if (
    !value ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    return null;
  }

  return value;
}
