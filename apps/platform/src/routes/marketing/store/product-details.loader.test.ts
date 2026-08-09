import type { LoaderFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlatformContainer: vi.fn(),
  getPublishedProductBySlug: vi.fn(),
}));

vi.mock("~/server/container.server", () => ({
  getPlatformContainer: mocks.getPlatformContainer,
}));

import { loader } from "./product-details";

describe("product details loader", () => {
  it("throws the controller's genuine 404 for an unknown or unpublished slug", async () => {
    // arrange
    mocks.getPlatformContainer.mockReturnValue({
      storeCatalogController: {
        getPublishedProductBySlug: mocks.getPublishedProductBySlug,
      },
    });
    mocks.getPublishedProductBySlug.mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    );

    // act
    const loading = loader({
      params: { slug: "unpublished-guide" },
    } as unknown as LoaderFunctionArgs);

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });
});
