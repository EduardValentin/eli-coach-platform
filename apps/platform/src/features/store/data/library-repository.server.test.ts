import { describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "@eli-coach-platform/db";

import { PostgresStoreLibraryRepository } from "./library-repository.server";

function productRow(options: {
  displayOrder: number;
  productId: number;
  slug: string;
  title: string;
  versionId: number;
}) {
  return {
    productId: options.productId,
    slug: options.slug,
    displayOrder: options.displayOrder,
    versionId: options.versionId,
    versionSequence: 2,
    title: options.title,
    creatorName: "Evoa Fitness",
    cardSummary: "A practical cycle-aware guide.",
    detailDescription:
      "Learn how energy and recovery change across the cycle.",
    includedItems: ["Phase-by-phase guidance"],
    coverAssetKey: `covers/${options.slug}.webp`,
    coverAlt: `${options.title} cover`,
    coverMimeType: "image/webp",
    coverSizeBytes: 96,
    coverSha256: "c".repeat(64),
    publishedAt: "2026-07-30T10:00:00.000Z",
  };
}

const hormoneHarmonyRow = productRow({
  displayOrder: 1,
  productId: 7,
  slug: "hormone-harmony",
  title: "Hormone Harmony",
  versionId: 11,
});


describe("PostgresStoreLibraryRepository", () => {
  it("maps the one owned product a slug names", async () => {
    // arrange
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ rows: [hormoneHarmonyRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const repository = new PostgresStoreLibraryRepository({
      execute,
    } as unknown as DatabaseClient);

    // act
    const product = await repository.findOwnedProductBySlug({
      accountId: "account-1",
      slug: "hormone-harmony",
    });

    // assert
    expect(product).toMatchObject({
      id: 7,
      slug: "hormone-harmony",
      version: { title: "Hormone Harmony" },
    });
  });

  it("returns null when no owned product matches the slug", async () => {
    // arrange
    const execute = vi.fn().mockResolvedValueOnce({ rows: [] });
    const repository = new PostgresStoreLibraryRepository({
      execute,
    } as unknown as DatabaseClient);

    // act
    const product = await repository.findOwnedProductBySlug({
      accountId: "account-1",
      slug: "unowned",
    });

    // assert
    expect(product).toBeNull();
  });
});
