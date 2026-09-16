import { describe, expect, it } from "vitest";

import type { StoreProduct } from "~/features/store/contracts/store";

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
    expect(presentation.matchCountText).toBe(
      "2 resources match your filters.",
    );
  });

  it("narrows to a single match under a type filter", () => {
    // arrange
    const products = createCatalog();
    const searchParams = new URLSearchParams("type=e-books");

    // act
    const presentation = presentCatalog(products, searchParams);

    // assert
    expect(presentation.filteredProducts.map((product) => product.slug)).toEqual([
      "hormone-harmony",
    ]);
    expect(presentation.matchCountText).toBe(
      "1 resource matches your filters.",
    );
  });

  it("reports no matches for a filter combination no product carries", () => {
    // arrange
    const products = createCatalog();
    const searchParams = new URLSearchParams("type=e-books&goal=fat-loss");

    // act
    const presentation = presentCatalog(products, searchParams);

    // assert
    expect(presentation.filteredProducts).toEqual([]);
    expect(presentation.matchCountText).toBe("No resources match your filters.");
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
