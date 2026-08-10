import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlatformContainer: vi.fn(),
  getPublishedCatalog: vi.fn(),
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

import { loader } from "./catalog-page";

describe("store catalog loader", () => {
  it("returns published catalog data for server rendering", async () => {
    // arrange
    const product = createProduct();
    mocks.getPlatformContainer.mockReturnValue({
      storeCatalogController: {
        getPublishedCatalog: mocks.getPublishedCatalog,
      },
    });
    mocks.getPublishedCatalog.mockResolvedValue(
      Response.json({ products: [product], success: true }),
    );

    // act
    const loaded = loader();

    // assert
    await expect(loaded).resolves.toEqual({ products: [product] });
  });

  it("preserves temporary unavailability as an HTTP 503", async () => {
    // arrange
    mocks.getPlatformContainer.mockReturnValue({
      storeCatalogController: {
        getPublishedCatalog: mocks.getPublishedCatalog,
      },
    });
    mocks.getPublishedCatalog.mockResolvedValue(
      Response.json(
        {
          error: {
            code: "server_error",
            message: "The store is temporarily unavailable.",
          },
          success: false,
        },
        { status: 503 },
      ),
    );

    // act
    const loading = loader();

    // assert
    await expect(loading).rejects.toMatchObject({ status: 503 });
  });
});

function createProduct() {
  return {
    cardSummary: "A practical cycle-aware guide.",
    cover: {
      alt: "Hormone Harmony guide cover",
      url: "/api/store/covers/hormone-harmony.webp",
    },
    creatorName: "Eli",
    detailDescription: "Phase-by-phase nutrition guidance.",
    goals: [{ displayOrder: 3, label: "Wellness", slug: "wellness" }],
    includedItems: ["Phase-by-phase guidance"],
    slug: "hormone-harmony",
    title: "Hormone Harmony",
    types: [{ displayOrder: 3, label: "E-Books", slug: "e-books" }],
  };
}
