export const STORE_COVER_MIME_TYPES = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function isStoreCoverMimeType(
  value: string,
): value is (typeof STORE_COVER_MIME_TYPES)[number] {
  return STORE_COVER_MIME_TYPES.some((mimeType) => mimeType === value);
}

export type StoreTaxonomyValue = {
  slug: string;
  label: string;
  displayOrder: number;
};

export type ProductAsset = {
  assetKey: string;
  customerFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

export type PublishedProductVersion = {
  id: number;
  sequence: number;
  title: string;
  creatorName: string;
  cardSummary: string;
  detailDescription: string;
  includedItems: readonly string[];
  cover: {
    assetKey: string;
    alt: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  };
  assets: readonly ProductAsset[];
  types: readonly StoreTaxonomyValue[];
  goals: readonly StoreTaxonomyValue[];
  publishedAt: Date;
};

export type PublishedStoreProduct = {
  id: number;
  slug: string;
  displayOrder: number;
  version: PublishedProductVersion;
};

export type PublishedProductCover = ProductAsset & {
  alt: string;
};

export type DownloadGrantItem = {
  productSlug: string;
  productTitle: string;
  productVersionId: number;
  assets: readonly ProductAsset[];
};

export type DownloadGrant = {
  id: number;
  status: "active" | "revoked";
  expiresAt: Date;
  items: readonly DownloadGrantItem[];
};
