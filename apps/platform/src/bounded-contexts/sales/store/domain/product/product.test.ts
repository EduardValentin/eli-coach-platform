import { describe, expect, it } from "vitest";

import {
  Product,
  PublishedProduct,
  type LockedProductState,
  type PinnedProductSelection,
} from "./product";
import { ProductPrice } from "./product-price";
import { ProductPricing } from "./product-pricing";

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
      currentPricing: ProductPricing.free(),
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
        currentPricing: ProductPricing.free(),
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
      currentPricing: ProductPricing.free(),
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
      pricing: ProductPricing.free(),
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

const paidPricing = ProductPricing.paid(
  ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 }),
);

function productPriced(
  currentPricing: ProductPricing,
  lifecycleStatus: "archived" | "published" = "published",
): Product {
  return Product.reconstitute({
    currentPricing,
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
    const product = productPriced(ProductPricing.free());

    // act
    const decision = product.planPriceChange(paidPricing);

    // assert
    expect(decision).toEqual({
      status: "planned",
      plan: {
        pricing: paidPricing,
        productId: 7,
        productSlug: "glute-growth-guide",
      },
    });
  });

  it("plans a paid product turning free", () => {
    // arrange
    const product = productPriced(paidPricing);

    // act
    const decision = product.planPriceChange(ProductPricing.free());

    // assert
    expect(decision).toEqual({
      status: "planned",
      plan: {
        pricing: ProductPricing.free(),
        productId: 7,
        productSlug: "glute-growth-guide",
      },
    });
  });

  it("plans new amounts for a paid product", () => {
    // arrange
    const product = productPriced(paidPricing);
    const next = ProductPricing.reconstitute({
      kind: "paid",
      eurCents: 4900,
      usdCents: 5500,
    });

    // act
    const decision = product.planPriceChange(next);

    // assert
    expect(decision).toMatchObject({
      status: "planned",
      plan: { pricing: next },
    });
  });

  it.each([
    [
      "the same amounts",
      paidPricing,
      ProductPricing.reconstitute({
        kind: "paid",
        eurCents: 3900,
        usdCents: 4500,
      }),
    ],
    ["free to free", ProductPricing.free(), ProductPricing.free()],
  ])("refuses %s as unchanged", (_label, currentPricing, next) => {
    // arrange
    const product = productPriced(currentPricing);

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
    const product = productPriced(ProductPricing.free(), "archived");

    // act
    const decision = product.planPriceChange(paidPricing);

    // assert
    expect(decision).toEqual({
      status: "refused",
      issue: { code: "product_retired" },
    });
  });
});

describe("PublishedProduct.isPaid", () => {
  it.each([
    ["paid", paidPricing, true],
    ["free", ProductPricing.free(), false],
  ])("reports a %s published product", (_label, pricing, paid) => {
    // arrange
    const publishedProduct = PublishedProduct.reconstitute({
      displayOrder: 1,
      id: 7,
      pricing,
      slug: "hormone-harmony",
      version: {} as PublishedProduct["version"],
    });

    // act
    const isPaid = publishedProduct.isPaid();

    // assert
    expect(isPaid).toBe(paid);
  });
});
