import { describe, expect, it } from "vitest";

import { Product } from "./product";
import type { ProductAssetDigestPort } from "./product-asset-digest-port";
import { ProductPrice, type ProductPriceInput } from "./product-price";
import { ProductPriceChange } from "./product-price-change";

const contentDigestPort: ProductAssetDigestPort = {
  sha256: (bytes) => new TextDecoder().decode(bytes),
};

const publication = {
  id: 52,
  operation: "reprice_product" as const,
  productId: 7,
  productSlug: "glute-growth-guide",
  productVersionId: null,
  publishedAt: new Date("2026-11-08T12:00:00.000Z"),
};

function product(
  options: {
    currentPrice?: ProductPrice | null;
    lifecycleStatus?: "archived" | "published";
  } = {},
): Product {
  return Product.reconstitute({
    currentPrice: options.currentPrice ?? null,
    displayOrder: 2,
    id: 7,
    latestVersionSequence: 3,
    lifecycleStatus: options.lifecycleStatus ?? "published",
    slug: "glute-growth-guide",
  });
}

function changeOf(
  prices: ProductPriceInput | null,
  productId = 7,
): ProductPriceChange {
  return ProductPriceChange.from({ prices, productId });
}

describe("ProductPriceChange.requestDigest", () => {
  it("is stable for equal input", () => {
    // arrange
    const change = changeOf({ eurCents: 3900, usdCents: 4500 });

    // act
    const first = change.requestDigest(contentDigestPort);
    const second = changeOf({
      eurCents: 3900,
      usdCents: 4500,
    }).requestDigest(contentDigestPort);

    // assert
    expect(first).toBe(second);
  });

  it.each([
    ["the product turns free", { eurCents: 3900, usdCents: 4500 }, null],
    ["an empty price replaces free", null, {}],
    ["the amounts swap currencies", { eurCents: 3900 }, { usdCents: 3900 }],
  ])(
    "changes when %s",
    (
      _label,
      before: ProductPriceInput | null,
      after: ProductPriceInput | null,
    ) => {
      // arrange
      const original = changeOf(before);
      const changed = changeOf(after);

      // act
      const originalDigest = original.requestDigest(contentDigestPort);
      const changedDigest = changed.requestDigest(contentDigestPort);

      // assert
      expect(changedDigest).not.toBe(originalDigest);
    },
  );

  it("changes when the change targets another product", () => {
    // arrange
    const original = changeOf(null, 7);
    const retargeted = changeOf(null, 8);

    // act
    const originalDigest = original.requestDigest(contentDigestPort);
    const retargetedDigest = retargeted.requestDigest(contentDigestPort);

    // assert
    expect(retargetedDigest).not.toBe(originalDigest);
  });
});

describe("ProductPriceChange.settle", () => {
  it("replays a stored publication recorded for the same payload", () => {
    // arrange
    const change = changeOf(null);

    // act
    const settled = change.settle(
      { payloadDigest: "digest-1", publication },
      "digest-1",
    );

    // assert
    expect(settled).toEqual({ status: "replayed", publication });
  });

  it("reports a key reused with a different payload as a conflict", () => {
    // arrange
    const change = changeOf(null);

    // act
    const settled = change.settle(
      { payloadDigest: "digest-1", publication },
      "digest-2",
    );

    // assert
    expect(settled).toEqual({ status: "idempotency_conflict" });
  });

  it("leaves an unseen key unsettled", () => {
    // arrange
    const change = changeOf(null);

    // act
    const settled = change.settle(null, "digest-1");

    // assert
    expect(settled).toBeNull();
  });
});

describe("ProductPriceChange.plan", () => {
  it("plans a free product turning paid", () => {
    // arrange
    const change = changeOf({ eurCents: 3900, usdCents: 4500 });

    // act
    const result = change.plan(product());

    // assert
    expect(result).toEqual({
      status: "valid",
      plan: {
        price: ProductPrice.reconstitute({ eurCents: 3900, usdCents: 4500 }),
        productId: 7,
        productSlug: "glute-growth-guide",
      },
    });
  });

  it("plans a paid product turning free", () => {
    // arrange
    const change = changeOf(null);

    // act
    const result = change.plan(
      product({
        currentPrice: ProductPrice.reconstitute({
          eurCents: 3900,
          usdCents: 4500,
        }),
      }),
    );

    // assert
    expect(result).toEqual({
      status: "valid",
      plan: { price: null, productId: 7, productSlug: "glute-growth-guide" },
    });
  });

  it("reports an unknown product", () => {
    // arrange
    const change = changeOf({ eurCents: 3900, usdCents: 4500 });

    // act
    const result = change.plan(null);

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "product_not_found" }],
    });
  });

  it("names the price rule an amount breaks", () => {
    // arrange
    const change = changeOf({ eurCents: 39.5, usdCents: 4500 });

    // act
    const result = change.plan(product());

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [{ code: "price_not_whole_minor_units", currency: "EUR" }],
    });
  });

  it.each([
    [
      "a retired product",
      product({ lifecycleStatus: "archived" }),
      "product_retired",
    ],
    ["free to free", product(), "price_unchanged"],
  ])("refuses %s", (_label, target, code) => {
    // arrange
    const change = changeOf(null);

    // act
    const result = change.plan(target);

    // assert
    expect(result).toEqual({ status: "invalid", issues: [{ code }] });
  });
});

describe("ProductPriceChange.persistCommand", () => {
  it("carries the planned price and the request identity into the port command", () => {
    // arrange
    const change = changeOf({ eurCents: 3900, usdCents: 4500 });
    const result = change.plan(product());
    const plan = result.status === "valid" ? result.plan : null;

    // act
    const command = change.persistCommand(plan!, {
      idempotencyKey: "reprice-1",
      payloadDigest: "digest-1",
      publishedBy: { kind: "machine", id: "management-agent" },
    });

    // assert
    expect(command).toEqual({
      idempotencyKey: "reprice-1",
      payloadDigest: "digest-1",
      price: { eurCents: 3900, usdCents: 4500 },
      productId: 7,
      productSlug: "glute-growth-guide",
      publishedBy: { kind: "machine", id: "management-agent" },
    });
  });
});
