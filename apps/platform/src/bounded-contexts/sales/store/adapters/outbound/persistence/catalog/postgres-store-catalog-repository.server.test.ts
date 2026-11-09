import { describe, expect, it, vi } from "vitest";

import { ProductPricing } from "~/bounded-contexts/sales/store/domain/product";
import type { DatabaseClient } from "~/shared/database";

import { PostgresStoreCatalogRepository } from "./postgres-store-catalog-repository.server";

describe("PostgresStoreCatalogRepository", () => {
  it("maps the current published version, taxonomy, and protected assets", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            productId: 7,
            slug: "hormone-harmony",
            displayOrder: 1,
            versionId: 11,
            versionSequence: 2,
            title: "Hormone Harmony",
            creatorName: "Evoa Fitness",
            cardSummary: "A practical cycle-aware guide.",
            detailDescription:
              "Learn how energy and recovery change across the cycle.",
            includedItems: ["Phase-by-phase guidance"],
            coverAssetKey: "covers/hormone-harmony.webp",
            coverAlt: "Hormone Harmony guide cover",
            coverMimeType: "image/webp",
            coverSizeBytes: 96,
            coverSha256: "c".repeat(64),
            publishedAt: "2026-07-30T10:00:00.000Z",
            eurCents: null,
            usdCents: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            productVersionId: 11,
            assetKey: "products/hormone-harmony.pdf",
            customerFilename: "hormone-harmony.pdf",
            mimeType: "application/pdf",
            sizeBytes: 128,
            sha256: "a".repeat(64),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            productVersionId: 11,
            slug: "e-books",
            label: "E-Books",
            displayOrder: 3,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            productVersionId: 11,
            slug: "wellness",
            label: "Wellness",
            displayOrder: 3,
          },
        ],
      });
    const postgresStoreCatalogRepository = new PostgresStoreCatalogRepository({
      execute,
    } as unknown as DatabaseClient);

    // act
    const products = await postgresStoreCatalogRepository.getPublishedCatalog();

    // assert
    expect(products).toEqual([
      {
        id: 7,
        slug: "hormone-harmony",
        displayOrder: 1,
        pricing: ProductPricing.free(),
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
      },
    ]);
  });

  it("maps the current pricing of a paid product", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            productId: 8,
            slug: "glute-plan",
            displayOrder: 2,
            versionId: 12,
            versionSequence: 1,
            title: "Glute Plan",
            creatorName: "Eli Lungu",
            cardSummary: "A twelve-week plan.",
            detailDescription: "Progressive glute training.",
            includedItems: ["Weekly sessions"],
            coverAssetKey: "covers/glute-plan.webp",
            coverAlt: "Glute Plan cover",
            coverMimeType: "image/webp",
            coverSizeBytes: 96,
            coverSha256: "c".repeat(64),
            publishedAt: "2026-11-08T10:00:00.000Z",
            eurCents: 3900,
            usdCents: 4500,
          },
        ],
      })
      .mockResolvedValue({ rows: [] });
    const postgresStoreCatalogRepository = new PostgresStoreCatalogRepository({
      execute,
    } as unknown as DatabaseClient);

    // act
    const product =
      await postgresStoreCatalogRepository.getPublishedProductBySlug(
        "glute-plan",
      );

    // assert
    expect(product?.pricing).toEqual(
      ProductPricing.reconstitute({
        kind: "paid",
        eurCents: 3900,
        usdCents: 4500,
      }),
    );
  });
});
