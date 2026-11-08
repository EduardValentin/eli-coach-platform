import { describe, expect, it } from "vitest";

import type { StoreProduct } from "~/bounded-contexts/sales/store/public/store";

import { presentCatalog } from "./catalog-presenter";

describe("presentCatalog", () => {
  it("offers filters and reports every product when nothing is selected", () => {
    // arrange
    const products = createCatalog();
    const searchParams = new URLSearchParams();

    // act
    const presentation = presentCatalog(products, searchParams);

    // assert
    expect(presentation.offersFilters).toBe(true);
    expect(presentation.matchCountText).toBe("3 products match your filters.");
  });

  it("narrows to a single match under a type filter", () => {
    // arrange
    const products = createCatalog();
    const searchParams = new URLSearchParams("type=e-books");

    // act
    const presentation = presentCatalog(products, searchParams);

    // assert
    expect(presentation.plans).toEqual([]);
    expect(presentation.freeResources.map((product) => product.slug)).toEqual([
      "hormone-harmony",
    ]);
    expect(presentation.matchCountText).toBe("1 product matches your filters.");
  });

  it("reports no matches for a filter combination no product carries", () => {
    // arrange
    const products = createCatalog();
    const searchParams = new URLSearchParams("type=e-books&goal=fat-loss");

    // act
    const presentation = presentCatalog(products, searchParams);

    // assert
    expect(presentation.plans).toEqual([]);
    expect(presentation.freeResources).toEqual([]);
    expect(presentation.matchCountText).toBe("No products match your filters.");
  });

  it("sets paid products apart as plans and keeps the free ones as free resources", () => {
    // arrange
    const products = createCatalog();
    const searchParams = new URLSearchParams();

    // act
    const presentation = presentCatalog(products, searchParams);

    // assert
    expect(presentation.plans.map((product) => product.slug)).toEqual([
      "fat-loss-plan",
    ]);
    expect(presentation.freeResources.map((product) => product.slug)).toEqual([
      "hormone-harmony",
      "lean-kitchen",
    ]);
  });

  it("applies the filters to the plans as well as the free resources", () => {
    // arrange
    const products = createCatalog();
    const searchParams = new URLSearchParams("goal=fat-loss");

    // act
    const presentation = presentCatalog(products, searchParams);

    // assert
    expect(presentation.plans.map((product) => product.slug)).toEqual([
      "fat-loss-plan",
    ]);
    expect(presentation.freeResources.map((product) => product.slug)).toEqual([
      "lean-kitchen",
    ]);
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
      types: [TYPE_E_BOOKS],
    }),
    createProduct({
      goals: [GOAL_FAT_LOSS],
      slug: "lean-kitchen",
      types: [TYPE_WORKOUTS],
    }),
    {
      ...createProduct({
        goals: [GOAL_FAT_LOSS],
        slug: "fat-loss-plan",
        types: [TYPE_WORKOUTS],
      }),
      price: { eurCents: 3900, usdCents: 4500 },
    },
  ];
}

function createProduct(
  product: Pick<StoreProduct, "goals" | "slug" | "types">,
): StoreProduct {
  return {
    cardSummary: "A practical guide.",
    cover: {
      alt: `${product.slug} cover`,
      url: `/api/store/covers/${product.slug}.webp`,
    },
    creatorName: "Eli",
    detailDescription: "Phase-by-phase guidance.",
    includedItems: ["A weekly plan"],
    price: null,
    title: product.slug,
    ...product,
  };
}
