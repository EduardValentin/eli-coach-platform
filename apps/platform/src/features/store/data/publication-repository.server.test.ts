import { describe, expect, it, vi } from "vitest";

import type { PersistPublicationCommand } from "@eli-coach-platform/domain";

import type { DatabaseClient } from "@eli-coach-platform/db";

import { PostgresStoreProductPublicationRepository } from "./publication-repository.server";

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
          { slug: "muscle-building", label: "Muscle Building", displayOrder: 1 },
        ],
      });
    const repository = new PostgresStoreProductPublicationRepository(
      createDatabase(execute),
    );

    // act
    const taxonomy = await repository.getTaxonomy();

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
          id: 7,
          latestVersionSequence: "3",
          lifecycleStatus: "published",
          slug: "glute-growth-guide",
        },
      ],
    });
    const repository = new PostgresStoreProductPublicationRepository(
      createDatabase(execute),
    );

    // act
    const product = await repository.findProductBySlug("glute-growth-guide");

    // assert
    expect(product).toEqual({
      displayOrder: 2,
      id: 7,
      latestVersionSequence: 3,
      lifecycleStatus: "published",
      slug: "glute-growth-guide",
    });
  });

  it("reports an unknown product as null", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresStoreProductPublicationRepository(
      createDatabase(execute),
    );

    // act
    const product = await repository.findProductById(404);

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
    const repository = new PostgresStoreProductPublicationRepository(
      createDatabase(execute),
    );

    // act
    const record = await repository.findPublicationByIdempotencyKey("key-1");

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
    const repository = new PostgresStoreProductPublicationRepository(
      createDatabase(execute),
    );

    // act
    const nextDisplayOrder = await repository.getNextDisplayOrder();

    // assert
    expect(nextDisplayOrder).toBe(5);
  });

  it("starts the catalog order at one when no product exists", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresStoreProductPublicationRepository(
      createDatabase(execute),
    );

    // act
    const nextDisplayOrder = await repository.getNextDisplayOrder();

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
    const repository = new PostgresStoreProductPublicationRepository({
      transaction,
    } as unknown as DatabaseClient);

    // act
    const result = await repository.persistPublication(persistCommand());

    // assert
    expect(result).toBe(publication);
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("does not retry a failure that serialization cannot explain", async () => {
    // arrange
    const transaction = vi.fn().mockRejectedValue({ code: "23505" });
    const repository = new PostgresStoreProductPublicationRepository({
      transaction,
    } as unknown as DatabaseClient);

    // act
    const persisting = repository.persistPublication(persistCommand());

    // assert
    await expect(persisting).rejects.toMatchObject({ code: "23505" });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry budget rather than looping forever", async () => {
    // arrange
    const transaction = vi.fn().mockRejectedValue({ code: "40001" });
    const repository = new PostgresStoreProductPublicationRepository({
      transaction,
    } as unknown as DatabaseClient);

    // act
    const persisting = repository.persistPublication(persistCommand());

    // assert
    await expect(persisting).rejects.toMatchObject({ code: "40001" });
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("reports retirement of an unknown product as no rows changed", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresStoreProductPublicationRepository(
      createDatabase(execute),
    );

    // act
    const retired = await repository.retireProduct(404);

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
    productId: null,
    productSlug: "glute-growth-guide",
    publishedBy: { kind: "machine", id: "management-api-agent" },
    typeSlugs: ["e-books"],
    versionSequence: 1,
  };
}
