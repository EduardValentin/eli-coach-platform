// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

const server = setupServer();
const applicationBasePath = "/eli-coach-platform/";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.unstubAllEnvs();
});

afterAll(() => {
  server.close();
});

describe("store catalog API under an application base path", () => {
  it("loads the cart catalog without duplicating the router basename", async () => {
    // arrange
    vi.stubEnv("BASE_URL", applicationBasePath);
    const storeApi = await import("./store-api");
    server.use(
      http.get(storeApi.STORE_CATALOG_API_URL, () =>
        HttpResponse.json({
          products: [createProduct()],
          success: true,
        }),
      ),
    );

    function CatalogProbe() {
      const catalog = storeApi.useStoreCatalogFetcher({ enabled: true });

      if (catalog.isPending) {
        return <p>Loading catalog</p>;
      }

      return <p>{catalog.data?.[0]?.title ?? "Catalog unavailable"}</p>;
    }

    const router = createMemoryRouter(
      [
        {
          Component: CatalogProbe,
          ErrorBoundary: () => <p>Route failed</p>,
          path: "/",
        },
        {
          loader: () => fetch(storeApi.STORE_CATALOG_API_URL),
          path: "api/store/catalog",
        },
      ],
      {
        basename: applicationBasePath,
        initialEntries: [applicationBasePath],
      },
    );

    // act
    render(<RouterProvider router={router} />);

    // assert
    expect(await screen.findByText("Hormone Harmony")).toBeInTheDocument();
    expect(screen.queryByText("Route failed")).not.toBeInTheDocument();
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
