import { createHash } from "node:crypto";
import { PassThrough, Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import {
  ProductAssetUnavailableError,
  type DownloadGrant,
  type ProductAsset,
  type ProductAssetStore,
} from "@eli-coach-platform/domain";

import { ZipDeliveryStream } from "./zip-stream.server";

describe("ZipDeliveryStream", () => {
  it("streams every pinned grant asset into product-specific ZIP directories", async () => {
    // arrange
    const assets = new Map([
      ["guides/meal-plan.pdf", Buffer.from("meal plan")],
      ["guides/workout.pdf", Buffer.from("workout")],
    ]);
    const store = createAssetStore(assets);
    const delivery = new ZipDeliveryStream(store);
    const grant = createGrant([...assets]);

    // act
    const stream = await delivery.create(grant);
    const zipContents = await readStream(stream);

    // assert
    expect(zipContents.subarray(0, 2).toString()).toBe("PK");
    expect(zipContents.toString("binary")).toContain(
      "nutrition-guide/meal-plan.pdf",
    );
    expect(zipContents.toString("binary")).toContain(
      "nutrition-guide/workout.pdf",
    );
    expect(store.openVerified).toHaveBeenCalledTimes(2);
  });

  it("closes preopened sources when any pinned asset is unavailable", async () => {
    // arrange
    const firstContents = Buffer.from("meal plan");
    const firstStream = Readable.from([firstContents]);
    const closeFirstStream = vi.spyOn(firstStream, "destroy");
    const store: ProductAssetStore = {
      assertReady: vi.fn(),
      openVerified: vi
        .fn()
        .mockResolvedValueOnce(firstStream)
        .mockRejectedValueOnce(new ProductAssetUnavailableError()),
    };
    const delivery = new ZipDeliveryStream(store);
    const grant = createGrant([
      ["guides/meal-plan.pdf", firstContents],
      ["guides/workout.pdf", Buffer.from("workout")],
    ]);

    // act
    const createStream = delivery.create(grant);

    // assert
    await expect(createStream).rejects.toThrow(
      "A granted product asset is unavailable.",
    );
    expect(store.openVerified).toHaveBeenCalledTimes(2);
    expect(closeFirstStream).toHaveBeenCalledOnce();
  });

  it("opens and verifies every source before returning the archive", async () => {
    // arrange
    const assets = new Map([
      ["guides/meal-plan.pdf", Buffer.from("meal plan")],
      ["guides/workout.pdf", Buffer.from("workout")],
    ]);
    const store = createAssetStore(assets);
    const delivery = new ZipDeliveryStream(store);

    // act
    const stream = await delivery.create(createGrant([...assets]));

    // assert
    expect(store.openVerified).toHaveBeenCalledTimes(2);
    const zipContents = await readStream(stream);

    expect(zipContents.subarray(0, 2).toString()).toBe("PK");
  });

  it("closes every preopened source when the archive consumer cancels", async () => {
    // arrange
    const firstStream = new PassThrough();
    const secondStream = new PassThrough();
    const closeFirstStream = vi.spyOn(firstStream, "destroy");
    const closeSecondStream = vi.spyOn(secondStream, "destroy");
    const store: ProductAssetStore = {
      assertReady: vi.fn(),
      openVerified: vi
        .fn()
        .mockResolvedValueOnce(firstStream)
        .mockResolvedValueOnce(secondStream),
    };
    const delivery = new ZipDeliveryStream(store);
    const archive = (await delivery.create(
      createGrant([
        ["guides/meal-plan.pdf", Buffer.from("meal plan")],
        ["guides/workout.pdf", Buffer.from("workout")],
      ]),
    )) as Readable;
    const archiveClosed = new Promise<void>((resolve) => {
      archive.once("close", resolve);
    });

    // act
    archive.destroy();
    await archiveClosed;

    // assert
    expect(closeFirstStream).toHaveBeenCalledOnce();
    expect(closeSecondStream).toHaveBeenCalledOnce();
  });

  it("closes unopened sequential sources when an earlier source fails", async () => {
    // arrange
    const firstStream = new Readable({
      read() {
        this.destroy(new Error("asset read failed"));
      },
    });
    const secondStream = new PassThrough();
    const closeSecondStream = vi.spyOn(secondStream, "destroy");
    const store: ProductAssetStore = {
      assertReady: vi.fn(),
      openVerified: vi
        .fn()
        .mockResolvedValueOnce(firstStream)
        .mockResolvedValueOnce(secondStream),
    };
    const delivery = new ZipDeliveryStream(store);
    const archive = await delivery.create(
      createGrant([
        ["guides/meal-plan.pdf", Buffer.from("meal plan")],
        ["guides/workout.pdf", Buffer.from("workout")],
      ]),
    );

    // act
    const downloadedArchive = readStream(archive);

    // assert
    await expect(downloadedArchive).rejects.toThrow("asset read failed");
    expect(closeSecondStream).toHaveBeenCalledOnce();
  });

  it("rejects before returning an archive when an asset cannot be opened", async () => {
    // arrange
    const assets = new Map([
      ["guides/meal-plan.pdf", Buffer.from("meal plan")],
    ]);
    const store = createAssetStore(assets);
    vi.mocked(store.openVerified).mockRejectedValue(
      new Error("asset open failed"),
    );
    const delivery = new ZipDeliveryStream(store);

    // act
    const createStream = delivery.create(createGrant([...assets]));

    // assert
    await expect(createStream).rejects.toThrow("asset open failed");
  });

  it("rejects customer filenames that could escape their ZIP directory", async () => {
    // arrange
    const contents = Buffer.from("private");
    const asset = {
      ...createProductAsset("guides/private.pdf", contents),
      customerFilename: "..\\escape.pdf",
    };
    const store = createAssetStore(
      new Map([[asset.assetKey, contents]]),
    );
    const delivery = new ZipDeliveryStream(store);
    const grant = createGrant([[asset.assetKey, contents]]);
    grant.items[0]!.assets = [asset];

    // act
    const createStream = delivery.create(grant);

    // assert
    await expect(createStream).rejects.toThrow(
      "A granted product asset is unavailable.",
    );
    expect(store.openVerified).not.toHaveBeenCalled();
  });
});

function createAssetStore(
  assets: Map<string, Buffer>,
): ProductAssetStore & {
  openVerified: ReturnType<typeof vi.fn>;
} {
  return {
    assertReady: vi.fn(),
    openVerified: vi.fn(async (asset: ProductAsset) =>
      Readable.from([assets.get(asset.assetKey)!]),
    ),
  };
}

function createGrant(entries: readonly [string, Buffer][]): DownloadGrant {
  return {
    expiresAt: new Date("2026-08-06T10:00:00.000Z"),
    id: 31,
    items: [
      {
        assets: entries.map(([assetKey, contents]) =>
          createProductAsset(assetKey, contents),
        ),
        productSlug: "nutrition-guide",
        productTitle: "Nutrition Guide",
        productVersionId: 11,
      },
    ],
    status: "active",
  };
}

function createProductAsset(
  assetKey: string,
  contents: Buffer,
): ProductAsset {
  return {
    assetKey,
    customerFilename: assetKey.split("/").at(-1)!,
    mimeType: "application/pdf",
    sha256: createHash("sha256").update(contents).digest("hex"),
    sizeBytes: contents.byteLength,
  };
}

async function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream as Readable) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
