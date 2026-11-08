import { describe, expect, it } from "vitest";

import {
  Product,
  PublishedProduct,
  type LockedProductState,
  type PinnedProductSelection,
} from "./product";
import { ProductPrice } from "./product-price";

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

describe("Product.revisionPlacement", () => {
  it("places the next version where the product already sits", () => {
    // arrange
    const product = Product.reconstitute({
      displayOrder: 2,
      id: 7,
      currentPrice: null,
      latestVersionSequence: 3,
      lifecycleStatus: "published",
      slug: "glute-growth-guide",
    });

    // act
    const placement = product.revisionPlacement();

    // assert
    expect(placement).toEqual({
      displayOrder: 2,
      operation: "revise_product",
      productId: 7,
      productSlug: "glute-growth-guide",
      versionSequence: 4,
    });
  });
});

describe("Product.evaluatePurchasability", () => {
  it("accepts a published product whose pinned version is still current", () => {
    // arrange
    const lockedProducts = [publishedAndCurrent];

    // act
    const decision = Product.evaluatePurchasability(
      [selection],
      lockedProducts,
    );

    // assert
    expect(decision).toEqual({ status: "purchasable" });
  });

  it("refuses a product that is no longer published", () => {
    // arrange
    const lockedProducts = [
      { ...publishedAndCurrent, lifecycleStatus: "archived" as const },
    ];

    // act
    const decision = Product.evaluatePurchasability(
      [selection],
      lockedProducts,
    );

    // assert
    expect(decision).toEqual({ status: "unavailable", purchasableSlugs: [] });
  });

  it("refuses a published product that has no current published version", () => {
    // arrange
    const lockedProducts = [{ ...publishedAndCurrent, currentVersionId: null }];

    // act
    const decision = Product.evaluatePurchasability(
      [selection],
      lockedProducts,
    );

    // assert
    expect(decision).toEqual({ status: "unavailable", purchasableSlugs: [] });
  });

  it("refuses a pinned version the catalog has moved past, and still offers the product", () => {
    // arrange
    const lockedProducts = [{ ...publishedAndCurrent, currentVersionId: 12 }];

    // act
    const decision = Product.evaluatePurchasability(
      [selection],
      lockedProducts,
    );

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
    const decision = Product.evaluatePurchasability(
      [selection],
      lockedProducts,
    );

    // assert
    expect(decision).toEqual({ status: "unavailable", purchasableSlugs: [] });
  });

  it("refuses a slug the catalog now serves under another product id", () => {
    // arrange
    const lockedProducts = [{ ...publishedAndCurrent, productId: 2 }];

    // act
    const decision = Product.evaluatePurchasability(
      [selection],
      lockedProducts,
    );

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
    const decision = Product.evaluatePurchasability(
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

describe("Product#canBeRevised", () => {
  it.each([
    ["archived", false],
    ["draft", true],
    ["published", true],
  ] as const)(
    "lifecycle status %s can be revised: %s",
    (lifecycleStatus, expected) => {
      // arrange
      const product = Product.reconstitute({
        id: 7,
        slug: "focus-kit",
        displayOrder: 1,
        lifecycleStatus,
        latestVersionSequence: 3,
        currentPrice: null,
      });

      // act
      const canBeRevised = product.canBeRevised();

      // assert
      expect(canBeRevised).toBe(expected);
    },
  );
});

describe("Product#nextVersionSequence", () => {
  it("advances the latest sequence by one", () => {
    // arrange
    const product = Product.reconstitute({
      id: 7,
      slug: "focus-kit",
      displayOrder: 1,
      lifecycleStatus: "published",
      latestVersionSequence: 3,
      currentPrice: null,
    });

    // act
    const nextVersionSequence = product.nextVersionSequence();

    // assert
    expect(nextVersionSequence).toBe(4);
  });
});

describe("PublishedProduct#deliveryResource", () => {
  it("summarizes the current version's title and type labels", () => {
    // arrange
    const publishedProduct = PublishedProduct.reconstitute({
      id: 7,
      slug: "hormone-harmony",
      displayOrder: 1,
      version: {
        id: 11,
        sequence: 2,
        title: "Hormone Harmony",
        creatorName: "Evoa Fitness",
        cardSummary: "A practical cycle-aware guide.",
        detailDescription:
          "Learn how energy and recovery change across the cycle.",
        includedItems: ["Phase-by-phase guidance"],
        cover: {
          assetKey: "covers/hormone-harmony.webp",
          alt: "Hormone Harmony guide cover",
          mimeType: "image/webp",
          sizeBytes: 96,
          sha256: "c".repeat(64),
        },
        assets: [
          {
            assetKey: "products/hormone-harmony.pdf",
            customerFilename: "hormone-harmony.pdf",
            mimeType: "application/pdf",
            sizeBytes: 128,
            sha256: "a".repeat(64),
          },
        ],
        types: [{ slug: "e-books", label: "E-Books", displayOrder: 3 }],
        goals: [{ slug: "wellness", label: "Wellness", displayOrder: 3 }],
        publishedAt: new Date("2026-07-30T10:00:00.000Z"),
      },
      price: null,
    });

    // act
    const deliveryResource = publishedProduct.deliveryResource();

    // assert
    expect(deliveryResource).toEqual({
      title: "Hormone Harmony",
      typeLabels: ["E-Books"],
    });
  });
});

const paidPrice = ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 });

function productPriced(
  currentPrice: ProductPrice | null,
  lifecycleStatus: "archived" | "published" = "published",
): Product {
  return Product.reconstitute({
    currentPrice,
    displayOrder: 2,
    id: 7,
    latestVersionSequence: 3,
    lifecycleStatus,
    slug: "glute-growth-guide",
  });
}

describe("Product.planPriceChange", () => {
  it("plans a free product turning paid", () => {
    // arrange
    const product = productPriced(null);

    // act
    const decision = product.planPriceChange(paidPrice);

    // assert
    expect(decision).toEqual({
      status: "planned",
      plan: {
        price: paidPrice,
        productId: 7,
        productSlug: "glute-growth-guide",
      },
    });
  });

  it("plans a paid product turning free", () => {
    // arrange
    const product = productPriced(paidPrice);

    // act
    const decision = product.planPriceChange(null);

    // assert
    expect(decision).toEqual({
      status: "planned",
      plan: { price: null, productId: 7, productSlug: "glute-growth-guide" },
    });
  });

  it("plans new amounts for a paid product", () => {
    // arrange
    const product = productPriced(paidPrice);
    const next = ProductPrice.reconstitute({ eurCents: 4900, usdCents: 5500 });

    // act
    const decision = product.planPriceChange(next);

    // assert
    expect(decision).toMatchObject({
      status: "planned",
      plan: { price: next },
    });
  });

  it.each([
    [
      "the same amounts",
      paidPrice,
      ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 }),
    ],
    ["free to free", null, null],
  ])("refuses %s as unchanged", (_label, currentPrice, next) => {
    // arrange
    const product = productPriced(currentPrice);

    // act
    const decision = product.planPriceChange(next);

    // assert
    expect(decision).toEqual({
      status: "refused",
      issue: { code: "price_unchanged" },
    });
  });

  it("refuses a retired product", () => {
    // arrange
    const product = productPriced(null, "archived");

    // act
    const decision = product.planPriceChange(paidPrice);

    // assert
    expect(decision).toEqual({
      status: "refused",
      issue: { code: "product_retired" },
    });
  });
});

describe("PublishedProduct.isPaid", () => {
  it.each([
    ["paid", paidPrice, true],
    ["free", null, false],
  ])("reports a %s published product", (_label, price, paid) => {
    // arrange
    const publishedProduct = PublishedProduct.reconstitute({
      displayOrder: 1,
      id: 7,
      price,
      slug: "hormone-harmony",
      version: {} as PublishedProduct["version"],
    });

    // act
    const isPaid = publishedProduct.isPaid();

    // assert
    expect(isPaid).toBe(paid);
  });
});
