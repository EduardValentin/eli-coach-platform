import { describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "@eli-coach-platform/db";

import { PostgresStoreCatalogRepository } from "./catalog-repository.server";

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

function createRepository(rows: readonly (typeof hormoneHarmonyRow)[]) {
  const execute = vi
    .fn()
    .mockResolvedValueOnce({ rows })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] });

  return new PostgresStoreCatalogRepository({
    execute,
  } as unknown as DatabaseClient);
}

describe("PostgresStoreCatalogRepository", () => {
  it("lists the published catalog as mapped products", async () => {
    // arrange
    const repository = createRepository([hormoneHarmonyRow]);

    // act
    const products = await repository.getPublishedCatalog();

    // assert
    expect(products).toMatchObject([
      { id: 7, slug: "hormone-harmony", version: { title: "Hormone Harmony" } },
    ]);
  });

  it("returns null when no published product carries the slug", async () => {
    // arrange
    const repository = createRepository([]);

    // act
    const product = await repository.getPublishedProductBySlug("unknown");

    // assert
    expect(product).toBeNull();
  });
});
