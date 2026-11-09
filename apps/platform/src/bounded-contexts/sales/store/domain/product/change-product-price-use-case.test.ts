import { describe, expect, it, vi } from "vitest";

import {
  ChangeProductPriceUseCase,
  type ChangeProductPriceCommand,
} from "./change-product-price-use-case";
import { Product } from "./product";
import type { ProductAssetDigestPort } from "./product-asset-digest-port";
import { ProductPricing, type ProductPricingInput } from "./product-pricing";
import type { PublishingPrincipal } from "./product-publication";
import type { StoreProductPublicationsPort } from "./store-product-publications-port";

const AGENT = {
  kind: "machine",
  id: "management-agent",
} satisfies PublishingPrincipal;

const repricedPublication = {
  id: 52,
  operation: "reprice_product" as const,
  productId: 7,
  productSlug: "glute-growth-guide",
  productVersionId: null,
  publishedAt: new Date("2026-11-08T12:00:00.000Z"),
};

const FREE: ProductPricingInput = { kind: "free" };

const changePriceCommand: ChangeProductPriceCommand = {
  idempotencyKey: "reprice-1",
  pricing: { kind: "paid", eurCents: 3900, usdCents: 4500 },
  productId: 7,
  publishedBy: AGENT,
};

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

function createUseCase(overrides: Partial<StoreProductPublicationsPort> = {}) {
  const storeProductPublicationsPort: StoreProductPublicationsPort = {
    findProductById: vi
      .fn()
      .mockResolvedValue(productPriced(ProductPricing.free())),
    findProductBySlug: vi.fn(),
    findPublicationByIdempotencyKey: vi.fn().mockResolvedValue(null),
    getNextDisplayOrder: vi.fn(),
    getTaxonomy: vi.fn(),
    persistPriceChange: vi.fn().mockResolvedValue({
      status: "recorded",
      publication: repricedPublication,
    }),
    persistPublication: vi.fn(),
    retireProduct: vi.fn(),
    ...overrides,
  };
  const productAssetDigestPort: ProductAssetDigestPort = {
    sha256: (bytes) => new TextDecoder().decode(bytes),
  };

  return {
    changeProductPriceUseCase: new ChangeProductPriceUseCase({
      productAssetDigestPort,
      storeProductPublicationsPort,
    }),
    storeProductPublicationsPort,
  };
}

describe("ChangeProductPriceUseCase", () => {
  it("records a free product turning paid", async () => {
    // arrange
    const { changeProductPriceUseCase, storeProductPublicationsPort } =
      createUseCase();

    // act
    const result = await changeProductPriceUseCase.execute(changePriceCommand);

    // assert
    expect(result).toEqual({
      status: "published",
      publication: repricedPublication,
    });
    expect(
      storeProductPublicationsPort.persistPriceChange,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "reprice-1",
        pricing: { kind: "paid", eurCents: 3900, usdCents: 4500 },
        productId: 7,
        productSlug: "glute-growth-guide",
        publishedBy: AGENT,
      }),
    );
  });

  it("records a paid product turning free", async () => {
    // arrange
    const { changeProductPriceUseCase, storeProductPublicationsPort } =
      createUseCase({
        findProductById: vi.fn().mockResolvedValue(
          productPriced(
            ProductPricing.reconstitute({
              kind: "paid",
              eurCents: 3900,
              usdCents: 4500,
            }),
          ),
        ),
      });

    // act
    const result = await changeProductPriceUseCase.execute({
      ...changePriceCommand,
      pricing: FREE,
    });

    // assert
    expect(result.status).toBe("published");
    expect(
      storeProductPublicationsPort.persistPriceChange,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ pricing: { kind: "free" } }),
    );
  });

  it("replays a stored change for the same payload without recording again", async () => {
    // arrange
    const first = createUseCase();

    await first.changeProductPriceUseCase.execute(changePriceCommand);

    const storedDigest = vi.mocked(
      first.storeProductPublicationsPort.persistPriceChange,
    ).mock.calls[0]![0].payloadDigest;
    const { changeProductPriceUseCase, storeProductPublicationsPort } =
      createUseCase({
        findPublicationByIdempotencyKey: vi.fn().mockResolvedValue({
          payloadDigest: storedDigest,
          publication: repricedPublication,
        }),
      });

    // act
    const result = await changeProductPriceUseCase.execute(changePriceCommand);

    // assert
    expect(result).toEqual({
      status: "replayed",
      publication: repricedPublication,
    });
    expect(
      storeProductPublicationsPort.persistPriceChange,
    ).not.toHaveBeenCalled();
  });

  it("reports a key reused with a different payload as a conflict", async () => {
    // arrange
    const { changeProductPriceUseCase, storeProductPublicationsPort } =
      createUseCase({
        findPublicationByIdempotencyKey: vi.fn().mockResolvedValue({
          payloadDigest: "another-payload",
          publication: repricedPublication,
        }),
      });

    // act
    const result = await changeProductPriceUseCase.execute(changePriceCommand);

    // assert
    expect(result).toEqual({ status: "idempotency_conflict" });
    expect(
      storeProductPublicationsPort.persistPriceChange,
    ).not.toHaveBeenCalled();
  });

  it.each([
    [
      "an unknown product",
      null,
      changePriceCommand.pricing,
      "product_not_found",
    ],
    [
      "a retired product",
      productPriced(ProductPricing.free(), "archived"),
      changePriceCommand.pricing,
      "product_retired",
    ],
    [
      "a free product made free again",
      productPriced(ProductPricing.free()),
      FREE,
      "price_unchanged",
    ],
  ])("refuses %s without recording", async (_label, product, pricing, code) => {
    // arrange
    const { changeProductPriceUseCase, storeProductPublicationsPort } =
      createUseCase({ findProductById: vi.fn().mockResolvedValue(product) });

    // act
    const result = await changeProductPriceUseCase.execute({
      ...changePriceCommand,
      pricing,
    });

    // assert
    expect(result).toEqual({ status: "invalid", issues: [{ code }] });
    expect(
      storeProductPublicationsPort.persistPriceChange,
    ).not.toHaveBeenCalled();
  });

  it("names the price rule an amount breaks", async () => {
    // arrange
    const { changeProductPriceUseCase } = createUseCase();

    // act
    const result = await changeProductPriceUseCase.execute({
      ...changePriceCommand,
      pricing: { kind: "paid", eurCents: 0, usdCents: 4500 },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      issues: [
        {
          code: "price_out_of_range",
          currency: "EUR",
          minimum: 1,
          maximum: 99_999_999,
        },
      ],
    });
  });

  it("replays a racing retry the store settled under its lock", async () => {
    // arrange
    const { changeProductPriceUseCase } = createUseCase({
      persistPriceChange: vi.fn().mockResolvedValue({
        status: "replayed",
        publication: repricedPublication,
      }),
    });

    // act
    const result = await changeProductPriceUseCase.execute(changePriceCommand);

    // assert
    expect(result).toEqual({
      status: "replayed",
      publication: repricedPublication,
    });
  });

  it("reports a racing reuse of the key with a different payload as a conflict", async () => {
    // arrange
    const { changeProductPriceUseCase } = createUseCase({
      persistPriceChange: vi
        .fn()
        .mockResolvedValue({ status: "idempotency_conflict" }),
    });

    // act
    const result = await changeProductPriceUseCase.execute(changePriceCommand);

    // assert
    expect(result).toEqual({ status: "idempotency_conflict" });
  });

  it("reports unavailable when recording fails", async () => {
    // arrange
    const { changeProductPriceUseCase } = createUseCase({
      persistPriceChange: vi.fn().mockRejectedValue(new Error("lost")),
    });

    // act
    const result = await changeProductPriceUseCase.execute(changePriceCommand);

    // assert
    expect(result).toEqual({ status: "unavailable" });
  });
});
