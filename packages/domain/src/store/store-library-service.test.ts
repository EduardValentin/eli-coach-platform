import { describe, expect, it, vi } from "vitest";

import {
  StoreLibraryService,
  type PublishedStoreProduct,
  type StoreLibraryRepository,
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
  overrides: Partial<StoreLibraryRepository> = {},
): StoreLibraryRepository {
  return {
    listOwnedProducts: vi.fn().mockResolvedValue([product]),
    findOwnedProductBySlug: vi.fn().mockResolvedValue(product),
    ...overrides,
  };
}

describe("StoreLibraryService", () => {
  it("returns the database-authoritative owned products for an account", async () => {
    // arrange
    const repository = createRepository();
    const service = new StoreLibraryService(repository);

    // act
    const result = await service.listOwnedProducts("account-1");

    // assert
    expect(result).toEqual({ status: "available", products: [product] });
    expect(repository.listOwnedProducts).toHaveBeenCalledWith("account-1");
  });

  it("keeps an infrastructure failure distinct from an empty library", async () => {
    // arrange
    const repository = createRepository({
      listOwnedProducts: vi
        .fn()
        .mockRejectedValue(new Error("database unavailable")),
    });
    const service = new StoreLibraryService(repository);

    // act
    const result = await service.listOwnedProducts("account-1");

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });

  it("returns the owned product a slug names", async () => {
    // arrange
    const repository = createRepository();
    const service = new StoreLibraryService(repository);

    // act
    const result = await service.findOwnedProductBySlug({
      accountId: "account-1",
      slug: "hormone-harmony",
    });

    // assert
    expect(result).toEqual({ status: "available", product });
    expect(repository.findOwnedProductBySlug).toHaveBeenCalledWith({
      accountId: "account-1",
      slug: "hormone-harmony",
    });
  });

  it("returns a genuine not-found result for an unowned slug", async () => {
    // arrange
    const repository = createRepository({
      findOwnedProductBySlug: vi.fn().mockResolvedValue(null),
    });
    const service = new StoreLibraryService(repository);

    // act
    const result = await service.findOwnedProductBySlug({
      accountId: "account-1",
      slug: "unowned",
    });

    // assert
    expect(result).toEqual({ status: "not_found" });
    expect(repository.findOwnedProductBySlug).toHaveBeenCalledWith({
      accountId: "account-1",
      slug: "unowned",
    });
  });

  it("keeps an infrastructure failure distinct from a not-found lookup", async () => {
    // arrange
    const repository = createRepository({
      findOwnedProductBySlug: vi
        .fn()
        .mockRejectedValue(new Error("database unavailable")),
    });
    const service = new StoreLibraryService(repository);

    // act
    const result = await service.findOwnedProductBySlug({
      accountId: "account-1",
      slug: "hormone-harmony",
    });

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});
