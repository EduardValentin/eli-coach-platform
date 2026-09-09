import type {
  ProductAsset,
  PublishedStoreProduct,
} from "@eli-coach-platform/domain";

const guideDownload: ProductAsset = {
  assetKey: "products/hormone-harmony.pdf",
  customerFilename: "hormone-harmony.pdf",
  mimeType: "application/pdf",
  sha256: "a".repeat(64),
  sizeBytes: 128,
};

export function createPublishedProduct(options?: {
  assets?: readonly ProductAsset[];
}): PublishedStoreProduct {
  return {
    displayOrder: 1,
    id: 7,
    slug: "hormone-harmony",
    version: {
      assets: options?.assets ?? [guideDownload],
      cardSummary: "A practical cycle-aware guide.",
      cover: {
        alt: "Hormone Harmony cover",
        assetKey: "covers/hormone-harmony.webp",
        mimeType: "image/webp",
        sha256: "b".repeat(64),
        sizeBytes: 96,
      },
      creatorName: "Evoa Fitness",
      detailDescription: "Cycle-aware nutrition guidance.",
      goals: [{ displayOrder: 3, label: "Wellness", slug: "wellness" }],
      id: 11,
      includedItems: ["Phase-by-phase guidance"],
      publishedAt: new Date("2026-07-30T10:00:00.000Z"),
      sequence: 2,
      title: "Hormone Harmony",
      types: [{ displayOrder: 3, label: "E-Books", slug: "e-books" }],
    },
  };
}
