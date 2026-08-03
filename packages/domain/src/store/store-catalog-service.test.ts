import { describe, expect, it, vi } from "vitest";

import {
  StoreCatalogService,
  type PublishedStoreProduct,
  type StoreCatalogRepository,
} from "./index";

const product = {
  id: 7,
  slug: "hormone-harmony",
  displayOrder: 1,
  version: {
    id: 11,
    sequence: 2,
    title: "Hormone Harmony",
    creatorName: "Evoa Fitness",
    cardSummary: "A practical cycle-aware guide.",
    detailDescription: "Learn how energy and recovery change across the cycle.",
    includedItems: ["Phase-by-phase guidance"],
    cover: {
      assetKey: "covers/hormone-harmony.webp",
      alt: "Hormone Harmony guide cover",
      mimeType: "image/webp",
      sizeBytes: 96,
      sha256: "c".repeat(64),
    },
    assets: [
      {
        assetKey: "products/hormone-harmony.pdf",
        customerFilename: "hormone-harmony.pdf",
        mimeType: "application/pdf",
        sizeBytes: 128,
        sha256: "a".repeat(64),
      },
    ],
    types: [{ slug: "e-books", label: "E-Books", displayOrder: 3 }],
    goals: [{ slug: "wellness", label: "Wellness", displayOrder: 3 }],
    publishedAt: new Date("2026-07-30T10:00:00.000Z"),
  },
} satisfies PublishedStoreProduct;

function createRepository(
  overrides: Partial<StoreCatalogRepository> = {},
): StoreCatalogRepository {
  return {
    getPublishedCatalog: vi.fn().mockResolvedValue([product]),
    getPublishedProductBySlug: vi.fn().mockResolvedValue(product),
    getPublishedCoverByAssetKey: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("StoreCatalogService", () => {
  it("returns the database-authoritative published catalog", async () => {
    // arrange
    const service = new StoreCatalogService(createRepository());

    // act
    const result = await service.getPublishedCatalog();

    // assert
    expect(result).toEqual({ status: "available", products: [product] });
  });

  it("keeps an infrastructure failure distinct from an empty catalog", async () => {
    // arrange
    const repository = createRepository({
      getPublishedCatalog: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });
    const service = new StoreCatalogService(repository);

    // act
    const result = await service.getPublishedCatalog();

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });

  it("returns a genuine not-found result for an unpublished slug", async () => {
    // arrange
    const repository = createRepository({
      getPublishedProductBySlug: vi.fn().mockResolvedValue(null),
    });
    const service = new StoreCatalogService(repository);

    // act
    const result = await service.getPublishedProductBySlug("unpublished");

    // assert
    expect(result).toEqual({ status: "not_found" });
  });
});
