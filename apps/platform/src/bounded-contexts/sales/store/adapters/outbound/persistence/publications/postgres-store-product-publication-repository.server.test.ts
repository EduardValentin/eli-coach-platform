import { describe, expect, it, vi } from "vitest";

import {
  Product,
  ProductPricing,
  type PersistPriceChangeCommand,
  type PersistPublicationCommand,
} from "~/bounded-contexts/sales/store/domain/product";

import type { DatabaseClient } from "~/shared/database";

import { PostgresStoreProductPublicationRepository } from "./postgres-store-product-publication-repository.server";

function createDatabase(execute: ReturnType<typeof vi.fn>): DatabaseClient {
  return { execute } as unknown as DatabaseClient;
}

describe("PostgresStoreProductPublicationRepository", () => {
  it("maps the controlled taxonomy in display order", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ slug: "workouts", label: "Workouts", displayOrder: 1 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            slug: "muscle-building",
            label: "Muscle Building",
            displayOrder: 1,
          },
        ],
      });
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository(createDatabase(execute));

    // act
    const taxonomy =
      await postgresStoreProductPublicationRepository.getTaxonomy();

    // assert
    expect(taxonomy).toEqual({
      goals: [
        { slug: "muscle-building", label: "Muscle Building", displayOrder: 1 },
      ],
      types: [{ slug: "workouts", label: "Workouts", displayOrder: 1 }],
    });
  });

  it("coerces the aggregated latest version sequence Postgres returns", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          displayOrder: 2,
          eurCents: null,
          id: 7,
          latestVersionSequence: "3",
          lifecycleStatus: "published",
          slug: "glute-growth-guide",
          usdCents: null,
        },
      ],
    });
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository(createDatabase(execute));

    // act
    const product =
      await postgresStoreProductPublicationRepository.findProductBySlug(
        "glute-growth-guide",
      );

    // assert
    expect(product).toEqual(
      Product.reconstitute({
        currentPricing: ProductPricing.free(),
        displayOrder: 2,
        id: 7,
        latestVersionSequence: 3,
        lifecycleStatus: "published",
        slug: "glute-growth-guide",
      }),
    );
  });

  it("maps the product's current paid pricing", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          displayOrder: 2,
          eurCents: 3900,
          id: 7,
          latestVersionSequence: 1,
          lifecycleStatus: "published",
          slug: "glute-growth-guide",
          usdCents: 4500,
        },
      ],
    });
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository(createDatabase(execute));

    // act
    const product =
      await postgresStoreProductPublicationRepository.findProductById(7);

    // assert
    expect(product?.currentPricing).toEqual(
      ProductPricing.reconstitute({
        kind: "paid",
        eurCents: 3900,
        usdCents: 4500,
      }),
    );
  });

  it("reports an unknown product as null", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository(createDatabase(execute));

    // act
    const product =
      await postgresStoreProductPublicationRepository.findProductById(404);

    // assert
    expect(product).toBeNull();
  });

  it("maps a stored publication with its payload digest", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          createdAt: "2026-08-13T12:00:00.000Z",
          id: 41,
          operation: "create_product",
          payloadDigest: "a".repeat(64),
          productId: 7,
          productSlug: "glute-growth-guide",
          productVersionId: 91,
        },
      ],
    });
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository(createDatabase(execute));

    // act
    const record =
      await postgresStoreProductPublicationRepository.findPublicationByIdempotencyKey(
        "key-1",
      );

    // assert
    expect(record).toEqual({
      payloadDigest: "a".repeat(64),
      publication: {
        id: 41,
        operation: "create_product",
        productId: 7,
        productSlug: "glute-growth-guide",
        productVersionId: 91,
        publishedAt: new Date("2026-08-13T12:00:00.000Z"),
      },
    });
  });

  it("appends new products to the end of the catalog order", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValue({ rows: [{ nextDisplayOrder: "5" }] });
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository(createDatabase(execute));

    // act
    const nextDisplayOrder =
      await postgresStoreProductPublicationRepository.getNextDisplayOrder();

    // assert
    expect(nextDisplayOrder).toBe(5);
  });

  it("starts the catalog order at one when no product exists", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository(createDatabase(execute));

    // act
    const nextDisplayOrder =
      await postgresStoreProductPublicationRepository.getNextDisplayOrder();

    // assert
    expect(nextDisplayOrder).toBe(1);
  });

  it("retries a serialization failure, which is how two racing publishes settle", async () => {
    // arrange
    const publication = {
      id: 41,
      operation: "create_product" as const,
      productId: 7,
      productSlug: "glute-growth-guide",
      productVersionId: 91,
      publishedAt: new Date("2026-08-13T12:00:00.000Z"),
    };
    const transaction = vi
      .fn()
      .mockRejectedValueOnce({ code: "40001" })
      .mockResolvedValueOnce(publication);
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository({
        transaction,
      } as unknown as DatabaseClient);

    // act
    const result =
      await postgresStoreProductPublicationRepository.persistPublication(
        persistCommand(),
      );

    // assert
    expect(result).toBe(publication);
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("does not retry a failure that serialization cannot explain", async () => {
    // arrange
    const transaction = vi.fn().mockRejectedValue({ code: "23505" });
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository({
        transaction,
      } as unknown as DatabaseClient);

    // act
    const persisting =
      postgresStoreProductPublicationRepository.persistPublication(
        persistCommand(),
      );

    // assert
    await expect(persisting).rejects.toMatchObject({ code: "23505" });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry budget rather than looping forever", async () => {
    // arrange
    const transaction = vi.fn().mockRejectedValue({ code: "40001" });
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository({
        transaction,
      } as unknown as DatabaseClient);

    // act
    const persisting =
      postgresStoreProductPublicationRepository.persistPublication(
        persistCommand(),
      );

    // assert
    await expect(persisting).rejects.toMatchObject({ code: "40001" });
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("records a price change as a publication without a content version", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ createdAt: "2026-11-08T12:00:00.000Z", id: 52 }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const transaction = vi.fn((work) => work({ execute }));
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository({
        transaction,
      } as unknown as DatabaseClient);

    // act
    const publication =
      await postgresStoreProductPublicationRepository.persistPriceChange(
        priceChangeCommand(),
      );

    // assert
    expect(publication).toEqual({
      status: "recorded",
      publication: {
        id: 52,
        operation: "reprice_product",
        productId: 7,
        productSlug: "glute-growth-guide",
        productVersionId: null,
        publishedAt: new Date("2026-11-08T12:00:00.000Z"),
      },
    });
    expect(execute).toHaveBeenCalledTimes(4);
  });

  it("settles a racing retry of the same price change on the stored publication", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            createdAt: "2026-11-08T12:00:00.000Z",
            id: 52,
            operation: "reprice_product",
            payloadDigest: "c".repeat(64),
            productId: 7,
            productSlug: "glute-growth-guide",
            productVersionId: null,
          },
        ],
      });
    const transaction = vi.fn((work) => work({ execute }));
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository({
        transaction,
      } as unknown as DatabaseClient);

    // act
    const publication =
      await postgresStoreProductPublicationRepository.persistPriceChange(
        priceChangeCommand(),
      );

    // assert
    expect(publication).toMatchObject({
      status: "replayed",
      publication: { id: 52, productVersionId: null },
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("refuses a racing request reusing the key with a different payload", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 7 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            createdAt: "2026-11-08T12:00:00.000Z",
            id: 52,
            operation: "reprice_product",
            payloadDigest: "d".repeat(64),
            productId: 7,
            productSlug: "glute-growth-guide",
            productVersionId: null,
          },
        ],
      });
    const transaction = vi.fn((work) => work({ execute }));
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository({
        transaction,
      } as unknown as DatabaseClient);

    // act
    const outcome =
      await postgresStoreProductPublicationRepository.persistPriceChange(
        priceChangeCommand(),
      );

    // assert
    expect(outcome).toEqual({ status: "idempotency_conflict" });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("retries a serialization failure while recording a price change", async () => {
    // arrange
    const recorded = {
      status: "recorded" as const,
      publication: {
        id: 52,
        operation: "reprice_product" as const,
        productId: 7,
        productSlug: "glute-growth-guide",
        productVersionId: null,
        publishedAt: new Date("2026-11-08T12:00:00.000Z"),
      },
    };
    const transaction = vi
      .fn()
      .mockRejectedValueOnce({ code: "40001" })
      .mockResolvedValueOnce(recorded);
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository({
        transaction,
      } as unknown as DatabaseClient);

    // act
    const result =
      await postgresStoreProductPublicationRepository.persistPriceChange(
        priceChangeCommand(),
      );

    // assert
    expect(result).toBe(recorded);
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("reports retirement of an unknown product as no rows changed", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const postgresStoreProductPublicationRepository =
      new PostgresStoreProductPublicationRepository(createDatabase(execute));

    // act
    const retired =
      await postgresStoreProductPublicationRepository.retireProduct(404);

    // assert
    expect(retired).toBe(false);
  });
});

function persistCommand(): PersistPublicationCommand {
  return {
    cover: {
      alt: "Cover",
      assetKey: "covers/a.webp",
      mimeType: "image/webp",
      sha256: "a".repeat(64),
      sizeBytes: 12,
    },
    displayOrder: 1,
    downloads: [
      {
        assetKey: "products/b.pdf",
        customerFilename: "guide.pdf",
        mimeType: "application/pdf",
        sha256: "b".repeat(64),
        sizeBytes: 24,
      },
    ],
    goalSlugs: ["muscle-building"],
    idempotencyKey: "publish-1",
    metadata: {
      cardSummary: "Summary",
      creatorName: "Eli Lungu",
      detailDescription: "Description",
      goalSlugs: ["muscle-building"],
      includedItems: ["Item"],
      title: "Glute Growth Guide",
      typeSlugs: ["e-books"],
    },
    operation: "create_product",
    payloadDigest: "c".repeat(64),
    pricing: { kind: "free" },
    productId: null,
    productSlug: "glute-growth-guide",
    publishedBy: { kind: "user", id: "account-coach" },
    typeSlugs: ["e-books"],
    versionSequence: 1,
  };
}

function priceChangeCommand(): PersistPriceChangeCommand {
  return {
    idempotencyKey: "reprice-1",
    payloadDigest: "c".repeat(64),
    pricing: { kind: "paid", eurCents: 3900, usdCents: 4500 },
    productId: 7,
    productSlug: "glute-growth-guide",
    publishedBy: { kind: "user", id: "account-coach" },
  };
}
