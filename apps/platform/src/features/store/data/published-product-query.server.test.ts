import { sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "@eli-coach-platform/db";

import { loadPublishedProducts } from "./published-product-query.server";

const hormoneHarmonyRow = {
  productId: 7,
  slug: "hormone-harmony",
  displayOrder: 1,
  versionId: 11,
  versionSequence: 2,
  title: "Hormone Harmony",
  creatorName: "Evoa Fitness",
  cardSummary: "A practical cycle-aware guide.",
  detailDescription: "Learn how energy and recovery change across the cycle.",
  includedItems: ["Phase-by-phase guidance"],
  coverAssetKey: "covers/hormone-harmony.webp",
  coverAlt: "Hormone Harmony cover",
  coverMimeType: "image/webp",
  coverSizeBytes: 96,
  coverSha256: "c".repeat(64),
  publishedAt: "2026-07-30T10:00:00.000Z",
};

describe("loadPublishedProducts", () => {
  it("maps the current published version, taxonomy, and protected assets", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [hormoneHarmonyRow] })
      .mockResolvedValueOnce({
        rows: [
          {
            productVersionId: hormoneHarmonyRow.versionId,
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
            productVersionId: hormoneHarmonyRow.versionId,
            slug: "e-books",
            label: "E-Books",
            displayOrder: 3,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            productVersionId: hormoneHarmonyRow.versionId,
            slug: "wellness",
            label: "Wellness",
            displayOrder: 3,
          },
        ],
      });
    const database = { execute } as unknown as DatabaseClient;

    // act
    const products = await loadPublishedProducts(
      database,
      sql`product.lifecycle_status = 'published'`,
    );

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
            alt: "Hormone Harmony cover",
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
});
