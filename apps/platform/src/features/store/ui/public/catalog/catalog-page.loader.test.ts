import { describe, expect, it, vi } from "vitest";

import { storeContext } from "~/features/store/server/guards/store-context.server";
import type { StoreFeature } from "~/features/store/server/store-composition.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./catalog-page";

describe("store catalog loader", () => {
  it("returns published catalog data for server rendering", async () => {
    // arrange
    const product = createProduct();

    // act
    const loaded = loader(
      createLoaderArguments("https://eli.example/store", [product]),
    );

    // assert
    await expect(loaded).resolves.toEqual({ products: [product] });
  });

  it("preserves temporary unavailability as an HTTP 503", async () => {
    // arrange
    const unavailable = Response.json(
      {
        error: {
          code: "server_error",
          message: "The store is temporarily unavailable.",
        },
        success: false,
      },
      { status: 503 },
    );

    // act
    const loading = loader(
      createLoaderArgumentsForResponse(
        "https://eli.example/store",
        unavailable,
      ),
    );

    // assert
    await expect(loading).rejects.toMatchObject({ status: 503 });
  });

  it("serves the whole catalog to a filtered request, never a filtered one", async () => {
    // arrange
    const catalog = createCatalog();

    // act
    const loaded = loader(
      createLoaderArguments("https://eli.example/store?type=workouts", catalog),
    );

    // assert
    await expect(loaded).resolves.toEqual({ products: createCatalog() });
  });

  it("redirects a filter value no published product carries out of the URL", async () => {
    // arrange
    const catalog = createCatalog();

    // act
    const loading = loader(
      createLoaderArguments(
        "https://eli.example/store?type=nutrition-plans&goal=wellness",
        catalog,
      ),
    );

    // assert
    await expect(captureRedirect(loading)).resolves.toEqual({
      location: "/store?goal=wellness",
      status: 302,
    });
  });

  it("redirects a filter belonging to a dimension the catalog does not offer", async () => {
    // arrange
    const catalog = [
      createProduct(),
      { ...createProduct(), slug: "second-guide" },
    ];

    // act
    const loading = loader(
      createLoaderArguments("https://eli.example/store?type=e-books", catalog),
    );

    // assert
    await expect(captureRedirect(loading)).resolves.toEqual({
      location: "/store",
      status: 302,
    });
  });

  it("preserves unrelated query parameters while canonicalizing", async () => {
    // arrange
    const catalog = createCatalog();

    // act
    const loading = loader(
      createLoaderArguments(
        "https://eli.example/store?utm_source=newsletter&type=unknown",
        catalog,
      ),
    );

    // assert
    await expect(captureRedirect(loading)).resolves.toEqual({
      location: "/store?utm_source=newsletter",
      status: 302,
    });
  });
});

async function captureRedirect(loading: Promise<unknown>) {
  const thrown = await loading.then(
    () => null,
    (redirected: Response) => redirected,
  );

  if (!(thrown instanceof Response)) {
    throw new Error("Expected the loader to throw a redirect response.");
  }

  return { location: thrown.headers.get("Location"), status: thrown.status };
}

function createLoaderArguments(url: string, products: readonly unknown[]) {
  return createLoaderArgumentsForResponse(
    url,
    Response.json({ products, success: true }),
  );
}

function createLoaderArgumentsForResponse(url: string, response: Response) {
  const feature = {
    catalog: { getPublishedCatalog: vi.fn().mockResolvedValue(response) },
  } as unknown as StoreFeature;

  return {
    ...createRequestArgs({
      contexts: [contextEntry(storeContext, feature)],
      request: new Request(url),
    }),
    pattern: "/store",
    url: new URL(url),
  };
}

function createCatalog() {
  return [
    createProduct(),
    {
      ...createProduct(),
      goals: [{ displayOrder: 2, label: "Fat Loss", slug: "fat-loss" }],
      slug: "lean-kitchen",
      types: [{ displayOrder: 1, label: "Workouts", slug: "workouts" }],
    },
  ];
}

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
