import { describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "../database-client";
import { PostgresStoreCatalogRepository } from "./postgres-store-catalog-repository";

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
    const repository = new PostgresStoreCatalogRepository({
      execute,
    } as unknown as DatabaseClient);

    // act
    const products = await repository.getPublishedCatalog();

    // assert
    expect(products).toEqual([
      {
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
          types: [
            { slug: "e-books", label: "E-Books", displayOrder: 3 },
          ],
          goals: [
            { slug: "wellness", label: "Wellness", displayOrder: 3 },
          ],
          publishedAt: new Date("2026-07-30T10:00:00.000Z"),
        },
      },
    ]);
  });
});
