import { describe, expect, it, vi } from "vitest";

import type { StoreCatalogService } from "@eli-coach-platform/domain";

import { StoreCatalogController } from "./catalog-controller.server";
import { createPublishedProduct } from "./published-product.test-support.server";

describe("StoreCatalogController", () => {
  it("returns public catalog fields with a base-path-aware cover URL", async () => {
    // arrange
    const service = {
      getPublishedCatalog: vi.fn().mockResolvedValue({
        status: "available",
        products: [createPublishedProduct()],
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
