import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";

import type {
  ProductAssetStore,
  StoreCatalogService,
} from "@eli-coach-platform/domain";

import { StoreCoverAssetController } from "./store-cover-asset-controller.server";

describe("StoreCoverAssetController", () => {
  it("streams a verified published cover with public cache headers", async () => {
    // arrange
    const cover = {
      alt: "Hormone Harmony cover",
      assetKey: "covers/hormone-harmony.webp",
      customerFilename: "hormone-harmony.webp",
      mimeType: "image/webp",
      sha256: "a".repeat(64),
      sizeBytes: 5,
    };
    const catalogService = {
      getPublishedCoverByAssetKey: vi.fn().mockResolvedValue({
        status: "available",
        cover,
      }),
    } as unknown as StoreCatalogService;
    const assetStore = {
      assertReady: vi.fn(),
      openVerified: vi
        .fn()
        .mockResolvedValue(Readable.from([Buffer.from("cover")])),
    } satisfies ProductAssetStore;
    const controller = new StoreCoverAssetController(
      catalogService,
      assetStore,
    );

    // act
    const response = await controller.getCover(cover.assetKey);

    // assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(response.headers.get("Content-Security-Policy")).toBe(
      "sandbox; default-src 'none'",
    );
    await expect(response.text()).resolves.toBe("cover");
  });

  it("does not expose unpublished or unknown asset keys", async () => {
    // arrange
    const catalogService = {
      getPublishedCoverByAssetKey: vi
        .fn()
        .mockResolvedValue({ status: "not_found" }),
    } as unknown as StoreCatalogService;
    const assetStore = {
      assertReady: vi.fn(),
      openVerified: vi.fn(),
    } satisfies ProductAssetStore;
    const controller = new StoreCoverAssetController(
      catalogService,
      assetStore,
    );

    // act
    const response = await controller.getCover("private/secret.webp");

    // assert
    expect(response.status).toBe(404);
    expect(assetStore.openVerified).not.toHaveBeenCalled();
  });

  it("rejects an active cover MIME type before opening asset bytes", async () => {
    // arrange
    const catalogService = {
      getPublishedCoverByAssetKey: vi.fn().mockResolvedValue({
        status: "available",
        cover: {
          alt: "Unsafe cover",
          assetKey: "covers/unsafe.html",
          customerFilename: "unsafe.html",
          mimeType: "text/html",
          sha256: "a".repeat(64),
          sizeBytes: 5,
        },
      }),
    } as unknown as StoreCatalogService;
    const assetStore = {
      assertReady: vi.fn(),
      openVerified: vi.fn(),
    } satisfies ProductAssetStore;
    const controller = new StoreCoverAssetController(
      catalogService,
      assetStore,
    );

    // act
    const response = await controller.getCover("covers/unsafe.html");

    // assert
    expect(response.status).toBe(503);
    expect(assetStore.openVerified).not.toHaveBeenCalled();
  });
});
