import { describe, expect, it } from "vitest";

import {
  evaluatePurchasability,
  type LockedProductState,
  type PinnedProductSelection,
} from "./purchasability";

const selection: PinnedProductSelection = {
  productId: 1,
  slug: "focus-kit",
  pinnedVersionId: 11,
};

const publishedAndCurrent: LockedProductState = {
  productId: 1,
  slug: "focus-kit",
  lifecycleStatus: "published",
  currentVersionId: 11,
};

describe("evaluatePurchasability", () => {
  it("accepts a published product whose pinned version is still current", () => {
    // arrange
    const lockedProducts = [publishedAndCurrent];

    // act
    const decision = evaluatePurchasability([selection], lockedProducts);

    // assert
    expect(decision).toEqual({ status: "purchasable" });
  });

  it("refuses a product that is no longer published", () => {
    // arrange
    const lockedProducts = [
      { ...publishedAndCurrent, lifecycleStatus: "archived" as const },
    ];

    // act
    const decision = evaluatePurchasability([selection], lockedProducts);

    // assert
    expect(decision).toEqual({ status: "unavailable", purchasableSlugs: [] });
  });

  it("refuses a published product that has no current published version", () => {
    // arrange
    const lockedProducts = [{ ...publishedAndCurrent, currentVersionId: null }];

    // act
    const decision = evaluatePurchasability([selection], lockedProducts);

    // assert
    expect(decision).toEqual({ status: "unavailable", purchasableSlugs: [] });
  });

  it("refuses a pinned version the catalog has moved past, and still offers the product", () => {
    // arrange
    const lockedProducts = [{ ...publishedAndCurrent, currentVersionId: 12 }];

    // act
    const decision = evaluatePurchasability([selection], lockedProducts);

    // assert
    expect(decision).toEqual({
      status: "unavailable",
      purchasableSlugs: ["focus-kit"],
    });
  });

  it("refuses a selection whose slug the catalog does not hold", () => {
    // arrange
    const lockedProducts: readonly LockedProductState[] = [];

    // act
    const decision = evaluatePurchasability([selection], lockedProducts);

    // assert
    expect(decision).toEqual({ status: "unavailable", purchasableSlugs: [] });
  });

  it("refuses a slug the catalog now serves under another product id", () => {
    // arrange
    const lockedProducts = [{ ...publishedAndCurrent, productId: 2 }];

    // act
    const decision = evaluatePurchasability([selection], lockedProducts);

    // assert
    expect(decision).toEqual({
      status: "unavailable",
      purchasableSlugs: ["focus-kit"],
    });
  });

  it("names every purchasable slug when one selection of several is unavailable", () => {
    // arrange
    const secondSelection: PinnedProductSelection = {
      productId: 2,
      slug: "sleep-kit",
      pinnedVersionId: 21,
    };
    const lockedProducts = [
      publishedAndCurrent,
      {
        productId: 2,
        slug: "sleep-kit",
        lifecycleStatus: "draft" as const,
        currentVersionId: 21,
      },
    ];

    // act
    const decision = evaluatePurchasability(
      [selection, secondSelection],
      lockedProducts,
    );

    // assert
    expect(decision).toEqual({
      status: "unavailable",
      purchasableSlugs: ["focus-kit"],
    });
  });
});
