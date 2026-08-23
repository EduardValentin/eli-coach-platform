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
    const loaded = loader(createLoaderArguments("https://eli.example/store"));

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
    const loading = loader(
      createLoaderArguments("https://eli.example/store"),
    );

    // assert
    await expect(loading).rejects.toMatchObject({ status: 503 });
  });

  it("keeps a filtered request whose values the catalog offers", async () => {
    // arrange
    stubPublishedCatalog(createCatalog());

    // act
    const loaded = loader(
      createLoaderArguments("https://eli.example/store?type=workouts"),
    );

    // assert
    await expect(loaded).resolves.toEqual({ products: createCatalog() });
  });

  it("redirects a filter value no published product carries out of the URL", async () => {
    // arrange
    stubPublishedCatalog(createCatalog());

    // act
    const loading = loader(
      createLoaderArguments(
        "https://eli.example/store?type=nutrition-plans&goal=wellness",
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
    stubPublishedCatalog([
      createProduct(),
      { ...createProduct(), slug: "second-guide" },
    ]);

    // act
    const loading = loader(
      createLoaderArguments("https://eli.example/store?type=e-books"),
    );

    // assert
    await expect(captureRedirect(loading)).resolves.toEqual({
      location: "/store",
      status: 302,
    });
  });

  it("preserves unrelated query parameters while canonicalizing", async () => {
    // arrange
    stubPublishedCatalog(createCatalog());

    // act
    const loading = loader(
      createLoaderArguments(
        "https://eli.example/store?utm_source=newsletter&type=unknown",
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

function createLoaderArguments(url: string) {
  return {
    context: {} as never,
    params: {},
    pattern: "/store",
    request: new Request(url),
    url: new URL(url),
  };
}

function stubPublishedCatalog(products: readonly unknown[]) {
  mocks.getPlatformContainer.mockReturnValue({
    storeCatalogController: {
      getPublishedCatalog: mocks.getPublishedCatalog,
    },
  });
  mocks.getPublishedCatalog.mockResolvedValue(
    Response.json({ products, success: true }),
  );
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
