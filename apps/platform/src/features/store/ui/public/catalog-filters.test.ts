import { describe, expect, it } from "vitest";

import type { StoreProduct } from "~/features/store/contracts/store";

import {
  canonicalizeFilterSearchParams,
  collectFilterDimensions,
  filterProducts,
  haveOnlyFilterParamsChanged,
  resolveFilterSelection,
} from "./catalog-filters";

describe("store catalog filter dimensions", () => {
  it("lists every assigned value once, in taxonomy display order", () => {
    // arrange
    const products = [
      createProduct({
        goals: [GOAL_WELLNESS],
        slug: "hormone-harmony",
        types: [TYPE_E_BOOKS, TYPE_WORKOUTS],
      }),
      createProduct({
        goals: [GOAL_FAT_LOSS, GOAL_WELLNESS],
        slug: "lean-kitchen",
        types: [TYPE_WORKOUTS],
      }),
    ];

    // act
    const dimensions = collectFilterDimensions(products);

    // assert
    expect(dimensions.types.map((type) => type.slug)).toEqual([
      "workouts",
      "e-books",
    ]);
    expect(dimensions.goals.map((goal) => goal.slug)).toEqual([
      "fat-loss",
      "wellness",
    ]);
  });

  it("omits a dimension whose published products share a single value", () => {
    // arrange
    const products = [
      createProduct({
        goals: [GOAL_WELLNESS],
        slug: "hormone-harmony",
        types: [TYPE_E_BOOKS],
      }),
      createProduct({
        goals: [GOAL_FAT_LOSS],
        slug: "lean-kitchen",
        types: [TYPE_E_BOOKS],
      }),
    ];

    // act
    const dimensions = collectFilterDimensions(products);

    // assert
    expect(dimensions.types).toEqual([]);
    expect(dimensions.goals.map((goal) => goal.slug)).toEqual([
      "fat-loss",
      "wellness",
    ]);
  });

  it("omits both dimensions for an empty catalog", () => {
    // arrange
    const products: readonly StoreProduct[] = [];

    // act
    const dimensions = collectFilterDimensions(products);

    // assert
    expect(dimensions).toEqual({ goals: [], types: [] });
  });
});

describe("store catalog filter selection", () => {
  it("keeps values assigned to published products", () => {
    // arrange
    const dimensions = collectFilterDimensions(createCatalog());

    // act
    const selection = resolveFilterSelection(
      dimensions,
      new URLSearchParams("type=workouts&goal=wellness"),
    );

    // assert
    expect(selection).toEqual({ goal: "wellness", type: "workouts" });
  });

  it("drops a value no published product carries", () => {
    // arrange
    const dimensions = collectFilterDimensions(createCatalog());

    // act
    const selection = resolveFilterSelection(
      dimensions,
      new URLSearchParams("type=nutrition-plans&goal=hormonal-balance"),
    );

    // assert
    expect(selection).toEqual({ goal: null, type: null });
  });

  it("drops a value belonging to a dimension the catalog does not offer", () => {
    // arrange
    const products = [
      createProduct({
        goals: [GOAL_WELLNESS],
        slug: "hormone-harmony",
        types: [TYPE_E_BOOKS],
      }),
      createProduct({
        goals: [GOAL_FAT_LOSS],
        slug: "lean-kitchen",
        types: [TYPE_E_BOOKS],
      }),
    ];
    const dimensions = collectFilterDimensions(products);

    // act
    const selection = resolveFilterSelection(
      dimensions,
      new URLSearchParams("type=e-books&goal=wellness"),
    );

    // assert
    expect(selection).toEqual({ goal: "wellness", type: null });
  });

  it("takes the first applicable occurrence of a repeated parameter", () => {
    // arrange
    const dimensions = collectFilterDimensions(createCatalog());

    // act
    const selection = resolveFilterSelection(
      dimensions,
      new URLSearchParams("type=unknown&type=workouts&type=e-books"),
    );

    // assert
    expect(selection.type).toBe("workouts");
  });
});

describe("store catalog canonical filter parameters", () => {
  it("reports nothing to change when the parameters already match", () => {
    // arrange
    const searchParams = new URLSearchParams("type=workouts&goal=wellness");
    const selection = { goal: "wellness", type: "workouts" };

    // act
    const canonical = canonicalizeFilterSearchParams(searchParams, selection);

    // assert
    expect(canonical).toBeNull();
  });

  it("removes a dropped value and keeps unrelated parameters in place", () => {
    // arrange
    const searchParams = new URLSearchParams(
      "utm_source=newsletter&type=unknown&goal=wellness",
    );
    const selection = { goal: "wellness", type: null };

    // act
    const canonical = canonicalizeFilterSearchParams(searchParams, selection);

    // assert
    expect(canonical?.toString()).toBe(
      "utm_source=newsletter&goal=wellness",
    );
  });

  it("collapses a repeated parameter to its resolved value", () => {
    // arrange
    const searchParams = new URLSearchParams("type=workouts&type=e-books");
    const selection = { goal: null, type: "workouts" };

    // act
    const canonical = canonicalizeFilterSearchParams(searchParams, selection);

    // assert
    expect(canonical?.toString()).toBe("type=workouts");
  });

  it("removes both parameters when neither value applies", () => {
    // arrange
    const searchParams = new URLSearchParams("type=unknown&goal=unknown");
    const selection = { goal: null, type: null };

    // act
    const canonical = canonicalizeFilterSearchParams(searchParams, selection);

    // assert
    expect(canonical?.toString()).toBe("");
  });
});

describe("store catalog filtering", () => {
  it("matches a product carrying the selected value among several", () => {
    // arrange
    const catalog = createCatalog();

    // act
    const filtered = filterProducts(catalog, { goal: null, type: "e-books" });

    // assert
    expect(filtered.map((product) => product.slug)).toEqual([
      "hormone-harmony",
    ]);
  });

  it("requires both dimensions when both are selected", () => {
    // arrange
    const catalog = createCatalog();

    // act
    const filtered = filterProducts(catalog, {
      goal: "fat-loss",
      type: "workouts",
    });

    // assert
    expect(filtered.map((product) => product.slug)).toEqual(["lean-kitchen"]);
  });

  it("keeps the catalog order of the products it retains", () => {
    // arrange
    const catalog = createCatalog();

    // act
    const filtered = filterProducts(catalog, {
      goal: null,
      type: "workouts",
    });

    // assert
    expect(filtered.map((product) => product.slug)).toEqual([
      "hormone-harmony",
      "lean-kitchen",
    ]);
  });

  it("returns nothing for a valid pair no product carries", () => {
    // arrange
    const catalog = createCatalog();

    // act
    const filtered = filterProducts(catalog, {
      goal: "fat-loss",
      type: "e-books",
    });

    // assert
    expect(filtered).toEqual([]);
  });

  it("returns the whole catalog when nothing is selected", () => {
    // arrange
    const catalog = createCatalog();

    // act
    const filtered = filterProducts(catalog, { goal: null, type: null });

    // assert
    expect(filtered).toEqual(catalog);
  });
});

describe("store catalog revalidation", () => {
  it("recognizes a change confined to the filter parameters", () => {
    // arrange
    const currentUrl = new URL("https://eli.example/store?type=workouts");
    const nextUrl = new URL("https://eli.example/store?goal=wellness");

    // act
    const changed = haveOnlyFilterParamsChanged(currentUrl, nextUrl);

    // assert
    expect(changed).toBe(true);
  });

  it("rejects a change touching another parameter", () => {
    // arrange
    const currentUrl = new URL("https://eli.example/store?type=workouts");
    const nextUrl = new URL(
      "https://eli.example/store?type=workouts&utm_source=newsletter",
    );

    // act
    const changed = haveOnlyFilterParamsChanged(currentUrl, nextUrl);

    // assert
    expect(changed).toBe(false);
  });

  it("rejects a change of route", () => {
    // arrange
    const currentUrl = new URL("https://eli.example/store?type=workouts");
    const nextUrl = new URL("https://eli.example/store/lean-kitchen");

    // act
    const changed = haveOnlyFilterParamsChanged(currentUrl, nextUrl);

    // assert
    expect(changed).toBe(false);
  });

  it("rejects an unchanged URL so an explicit revalidation still runs", () => {
    // arrange
    const currentUrl = new URL("https://eli.example/store?type=workouts");
    const nextUrl = new URL("https://eli.example/store?type=workouts");

    // act
    const changed = haveOnlyFilterParamsChanged(currentUrl, nextUrl);

    // assert
    expect(changed).toBe(false);
  });
});

const TYPE_WORKOUTS = { displayOrder: 1, label: "Workouts", slug: "workouts" };
const TYPE_E_BOOKS = { displayOrder: 3, label: "E-Books", slug: "e-books" };
const GOAL_FAT_LOSS = { displayOrder: 2, label: "Fat Loss", slug: "fat-loss" };
const GOAL_WELLNESS = { displayOrder: 3, label: "Wellness", slug: "wellness" };

function createCatalog(): readonly StoreProduct[] {
  return [
    createProduct({
      goals: [GOAL_WELLNESS],
      slug: "hormone-harmony",
      types: [TYPE_WORKOUTS, TYPE_E_BOOKS],
    }),
    createProduct({
      goals: [GOAL_FAT_LOSS],
      slug: "lean-kitchen",
      types: [TYPE_WORKOUTS],
    }),
  ];
}

function createProduct(
  product: Pick<StoreProduct, "goals" | "slug" | "types">,
): StoreProduct {
  return {
    cardSummary: "A practical guide.",
    cover: { alt: `${product.slug} cover`, url: `/api/store/covers/${product.slug}.webp` },
    creatorName: "Eli",
    detailDescription: "Phase-by-phase guidance.",
    includedItems: ["A weekly plan"],
    title: product.slug,
    ...product,
  };
}
