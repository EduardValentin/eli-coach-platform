import { describe, expect, it, vi } from "vitest";

import { FindPublishedCoverUseCase } from "./find-published-cover-use-case";
import { FindPublishedProductUseCase } from "./find-published-product-use-case";
import { ListPublishedProductsUseCase } from "./list-published-products-use-case";
import { PublishedProduct } from "./product";
import type { StoreCatalog } from "./store-catalog";

const product = PublishedProduct.reconstitute({
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
});

function createCatalog(overrides: Partial<StoreCatalog> = {}): StoreCatalog {
  return {
    getPublishedCatalog: vi.fn().mockResolvedValue([product]),
    getPublishedProductBySlug: vi.fn().mockResolvedValue(product),
    getPublishedCoverByAssetKey: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("ListPublishedProductsUseCase", () => {
  it("returns the database-authoritative published catalog", async () => {
    // arrange
    const useCase = new ListPublishedProductsUseCase({
      catalog: createCatalog(),
    });

    // act
    const result = await useCase.execute();

    // assert
    expect(result).toEqual({ status: "available", products: [product] });
  });

  it("keeps an infrastructure failure distinct from an empty catalog", async () => {
    // arrange
    const catalog = createCatalog({
      getPublishedCatalog: vi
        .fn()
        .mockRejectedValue(new Error("database unavailable")),
    });
    const useCase = new ListPublishedProductsUseCase({ catalog });

    // act
    const result = await useCase.execute();

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});

describe("FindPublishedProductUseCase", () => {
  it("returns the published product for a known slug", async () => {
    // arrange
    const useCase = new FindPublishedProductUseCase({
      catalog: createCatalog(),
    });

    // act
    const result = await useCase.execute("hormone-harmony");

    // assert
    expect(result).toEqual({ status: "available", product });
  });

  it("returns a genuine not-found result for an unpublished slug", async () => {
    // arrange
    const catalog = createCatalog({
      getPublishedProductBySlug: vi.fn().mockResolvedValue(null),
    });
    const useCase = new FindPublishedProductUseCase({ catalog });

    // act
    const result = await useCase.execute("unpublished");

    // assert
    expect(result).toEqual({ status: "not_found" });
  });

  it("keeps an infrastructure failure distinct from a not-found slug", async () => {
    // arrange
    const catalog = createCatalog({
      getPublishedProductBySlug: vi
        .fn()
        .mockRejectedValue(new Error("database unavailable")),
    });
    const useCase = new FindPublishedProductUseCase({ catalog });

    // act
    const result = await useCase.execute("hormone-harmony");

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});

describe("FindPublishedCoverUseCase", () => {
  const cover = {
    assetKey: "covers/hormone-harmony.webp",
    alt: "Hormone Harmony guide cover",
    mimeType: "image/webp",
    sizeBytes: 96,
    sha256: "c".repeat(64),
  };

  it("returns the published cover for a known asset key", async () => {
    // arrange
    const catalog = createCatalog({
      getPublishedCoverByAssetKey: vi.fn().mockResolvedValue(cover),
    });
    const useCase = new FindPublishedCoverUseCase({ catalog });

    // act
    const result = await useCase.execute(cover.assetKey);

    // assert
    expect(result).toEqual({ status: "available", cover });
  });

  it("returns a genuine not-found result for an unknown asset key", async () => {
    // arrange
    const useCase = new FindPublishedCoverUseCase({
      catalog: createCatalog(),
    });

    // act
    const result = await useCase.execute("covers/unknown.webp");

    // assert
    expect(result).toEqual({ status: "not_found" });
  });

  it("keeps an infrastructure failure distinct from a not-found cover", async () => {
    // arrange
    const catalog = createCatalog({
      getPublishedCoverByAssetKey: vi
        .fn()
        .mockRejectedValue(new Error("database unavailable")),
    });
    const useCase = new FindPublishedCoverUseCase({ catalog });

    // act
    const result = await useCase.execute(cover.assetKey);

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});
