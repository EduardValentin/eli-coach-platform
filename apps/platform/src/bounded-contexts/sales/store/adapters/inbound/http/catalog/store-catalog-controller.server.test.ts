import { describe, expect, it, vi } from "vitest";

import {
  type FindPublishedProductUseCase,
  type ListPublishedProductsUseCase,
  ProductPrice,
  PublishedProduct,
} from "~/bounded-contexts/sales/store/domain/product";

import { StoreCatalogController } from "./store-catalog-controller.server";

describe("StoreCatalogController", () => {
  it("returns public catalog fields with a base-path-aware cover URL", async () => {
    // arrange
    const listPublishedProductsUseCase = {
      execute: vi.fn().mockResolvedValue({
        status: "available",
        products: [createProduct()],
      }),
    } as unknown as ListPublishedProductsUseCase;
    const findPublishedProductUseCase = {
      execute: vi.fn(),
    } as unknown as FindPublishedProductUseCase;
    const storeCatalogController = new StoreCatalogController({
      appBasePath: "/platform",
      findPublishedProductUseCase,
      listPublishedProductsUseCase,
    });

    // act
    const response = await storeCatalogController.getPublishedCatalog();

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
          price: null,
        }),
      ],
    });
  });

  it("returns a paid product with its fixed prices", async () => {
    // arrange
    const findPublishedProductUseCase = {
      execute: vi.fn().mockResolvedValue({
        status: "available",
        product: createProduct(
          ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 }),
        ),
      }),
    } as unknown as FindPublishedProductUseCase;
    const storeCatalogController = new StoreCatalogController({
      appBasePath: "/",
      findPublishedProductUseCase,
      listPublishedProductsUseCase: {
        execute: vi.fn(),
      } as unknown as ListPublishedProductsUseCase,
    });

    // act
    const response =
      await storeCatalogController.getPublishedProductBySlug("hormone-harmony");

    // assert
    await expect(response.json()).resolves.toMatchObject({
      price: { eurCents: 3900, usdCents: 4500 },
    });
  });

  it("keeps an unavailable catalog distinct from an empty catalog", async () => {
    // arrange
    const listPublishedProductsUseCase = {
      execute: vi.fn().mockResolvedValue({ status: "unavailable" }),
    } as unknown as ListPublishedProductsUseCase;
    const findPublishedProductUseCase = {
      execute: vi.fn(),
    } as unknown as FindPublishedProductUseCase;
    const storeCatalogController = new StoreCatalogController({
      appBasePath: "/",
      findPublishedProductUseCase,
      listPublishedProductsUseCase,
    });

    // act
    const response = await storeCatalogController.getPublishedCatalog();

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

function createProduct(price: ProductPrice | null = null): PublishedProduct {
  return PublishedProduct.reconstitute({
    displayOrder: 1,
    id: 7,
    price,
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
  });
}
