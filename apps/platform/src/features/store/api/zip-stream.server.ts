import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

import {
  StoredFileUnavailableError,
  type DownloadGrant,
  type ProductAsset,
  type VerifiedFileReader,
} from "@eli-coach-platform/domain";
import { ZipArchive } from "archiver";

const UNAVAILABLE_ASSET_MESSAGE = "A granted product asset is unavailable.";

export class ZipDeliveryStream {
  constructor(private readonly assetStore: VerifiedFileReader) {}

  async create(grant: DownloadGrant): Promise<NodeJS.ReadableStream> {
    const grantEntries = grant.items.flatMap((item) =>
      item.assets.map((asset) => ({
        asset,
        entryName: createEntryName(item.productSlug, asset),
      })),
    );
    const openedEntries: {
      entryName: string;
      stream: Readable;
    }[] = [];

    try {
      for (const { asset, entryName } of grantEntries) {
        openedEntries.push({
          entryName,
          stream: (await this.assetStore.openVerified(asset)) as Readable,
        });
      }
    } catch (error) {
      closeStreams(openedEntries);

      if (error instanceof StoredFileUnavailableError) {
        throw new StoredFileUnavailableError(
          UNAVAILABLE_ASSET_MESSAGE,
        );
      }

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

    return archive;
  }
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
): string {
  return `${assertSafeZipEntrySegment(
    productSlug,
  )}/${assertSafeZipEntrySegment(asset.customerFilename)}`;
}

function asError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("A granted product asset could not be streamed.");
}

function assertSafeZipEntrySegment(value: string): string {
  if (
    !value ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    throw new StoredFileUnavailableError(UNAVAILABLE_ASSET_MESSAGE);
  }

  return value;
}
