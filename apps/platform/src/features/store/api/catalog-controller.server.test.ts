import { describe, expect, it, vi } from "vitest";

import type {
  PublishedStoreProduct,
  StoreCatalogService,
} from "@eli-coach-platform/domain";

import { StoreCatalogController } from "./catalog-controller.server";

describe("StoreCatalogController", () => {
  it("returns public catalog fields with a base-path-aware cover URL", async () => {
    // arrange
    const service = {
      getPublishedCatalog: vi.fn().mockResolvedValue({
        status: "available",
        products: [createProduct()],
      }),
    } as unknown as StoreCatalogService;
    const controller = new StoreCatalogController(service, {
      appBasePath: "/platform",
    });

    // act
    const response = await controller.getPublishedCatalog();

    // assert
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      products: [
        expect.objectContaining({
          slug: "hormone-harmony",
          title: "Hormone Harmony",
          cover: {
            alt: "Hormone Harmony cover",
            url: "/platform/api/store/covers/covers%2Fhormone-harmony.webp",
          },
        }),
      ],
    });
  });

  it("keeps an unavailable catalog distinct from an empty catalog", async () => {
    // arrange
    const service = {
      getPublishedCatalog: vi
        .fn()
        .mockResolvedValue({ status: "unavailable" }),
    } as unknown as StoreCatalogService;
    const controller = new StoreCatalogController(service, {
      appBasePath: "/",
    });

    // act
    const response = await controller.getPublishedCatalog();

    // assert
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "server_error",
        message: "The store is temporarily unavailable.",
      },
    });
  });
});

export function createProduct(): PublishedStoreProduct {
  return {
    displayOrder: 1,
    id: 7,
    slug: "hormone-harmony",
    version: {
      assets: [
        {
          assetKey: "products/hormone-harmony.pdf",
          customerFilename: "hormone-harmony.pdf",
          mimeType: "application/pdf",
          sha256: "a".repeat(64),
          sizeBytes: 128,
        },
      ],
      cardSummary: "A practical guide.",
      cover: {
        alt: "Hormone Harmony cover",
        assetKey: "covers/hormone-harmony.webp",
        mimeType: "image/webp",
        sha256: "b".repeat(64),
        sizeBytes: 96,
      },
      creatorName: "Eli",
      detailDescription: "Cycle-aware nutrition guidance.",
      goals: [{ displayOrder: 3, label: "Wellness", slug: "wellness" }],
      id: 11,
      includedItems: ["Phase-by-phase guidance"],
      publishedAt: new Date("2026-07-30T10:00:00.000Z"),
      sequence: 2,
      title: "Hormone Harmony",
      types: [{ displayOrder: 3, label: "E-Books", slug: "e-books" }],
    },
  };
}
