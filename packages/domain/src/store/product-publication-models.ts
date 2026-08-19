import type { StoreTaxonomyValue } from "./models";

export const MAX_PUBLICATION_BYTES = 25 * 1024 * 1024;

export type PublicationOperation = "create_product" | "revise_product";

export type PublishingPrincipal = {
  kind: "machine" | "user";
  id: string;
};

export type ProductDownloadInput = {
  bytes: Uint8Array;
  customerFilename: string;
};

export type ProductCoverInput = {
  alt: string;
  bytes: Uint8Array;
};

export type ProductVersionMetadata = {
  cardSummary: string;
  creatorName: string;
  detailDescription: string;
  goalSlugs: readonly string[];
  includedItems: readonly string[];
  title: string;
  typeSlugs: readonly string[];
};

export type PlannedProductAsset = {
  assetKey: string;
  customerFilename: string;
  mimeType: string;
  sha256: string;
  sizeBytes: number;
};

export type PlannedProductCover = {
  alt: string;
  assetKey: string;
  mimeType: string;
  sha256: string;
  sizeBytes: number;
};

export type PublicationPlan = {
  cover: PlannedProductCover;
  displayOrder: number;
  downloads: readonly PlannedProductAsset[];
  goals: readonly StoreTaxonomyValue[];
  metadata: ProductVersionMetadata;
  operation: PublicationOperation;
  productId: number | null;
  productSlug: string;
  totalUploadBytes: number;
  types: readonly StoreTaxonomyValue[];
  versionSequence: number;
};

export type ProductPublication = {
  id: number;
  operation: PublicationOperation;
  productId: number;
  productSlug: string;
  productVersionId: number;
  publishedAt: Date;
};

export type PublicationIssue =
  | { code: "missing_downloads" }
  | { code: "invalid_slug"; slug: string }
  | { code: "slug_taken"; slug: string }
  | { code: "product_not_found" }
  | { code: "product_retired" }
  | { code: "duplicate_customer_filename"; customerFilename: string }
  | {
      code: "unsupported_download_extension";
      acceptedExtensions: readonly string[];
      customerFilename: string;
    }
  | { code: "download_content_mismatch"; customerFilename: string }
  | {
      code: "unsupported_cover_content";
      acceptedExtensions: readonly string[];
    }
  | { code: "unknown_type"; acceptedSlugs: readonly string[]; slug: string }
  | { code: "unknown_goal"; acceptedSlugs: readonly string[]; slug: string }
  | { code: "payload_too_large"; maxBytes: number; totalBytes: number };

export type PublicationPlanResult =
  | { status: "valid"; plan: PublicationPlan }
  | { status: "invalid"; issues: readonly PublicationIssue[] }
  | { status: "unavailable" };

export type PublishProductResult =
  | { status: "published"; publication: ProductPublication }
  | { status: "replayed"; publication: ProductPublication }
  | { status: "idempotency_conflict" }
  | { status: "invalid"; issues: readonly PublicationIssue[] }
  | { status: "unavailable" };

export type RetireProductResult =
  | { status: "retired"; productId: number }
  | { status: "not_found" }
  | { status: "unavailable" };
