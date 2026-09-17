import type {
  Product,
  PublicationOperation,
  PublicationPlacement,
  StoreTaxonomyValue,
} from "./product";
import {
  buildCoverAssetKey,
  buildDownloadAssetKey,
} from "./product-asset-keys";
import type { ProductAssetContent, ProductAssetDigest } from "./product-assets";
import {
  resolveCoverFormat,
  resolveDownloadFormat,
  STORE_COVER_EXTENSIONS,
  STORE_DOWNLOAD_EXTENSIONS,
} from "./product-file-formats";

export const MAX_PUBLICATION_BYTES = 25 * 1024 * 1024;

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

export type StoredPublicationRecord = {
  payloadDigest: string;
  publication: ProductPublication;
};

export type StoreTaxonomySnapshot = {
  goals: readonly StoreTaxonomyValue[];
  types: readonly StoreTaxonomyValue[];
};

export type PersistPublicationCommand = {
  cover: PlannedProductCover;
  displayOrder: number;
  downloads: readonly PlannedProductAsset[];
  goalSlugs: readonly string[];
  idempotencyKey: string;
  metadata: ProductVersionMetadata;
  operation: PublicationOperation;
  payloadDigest: string;
  productId: number | null;
  productSlug: string;
  publishedBy: PublishingPrincipal;
  typeSlugs: readonly string[];
  versionSequence: number;
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

export type PublicationTarget =
  | { kind: "new"; slug: string }
  | { kind: "revision"; targetProductSlug: string };

const PRODUCT_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
/**
 * ASCII record and unit separators, spelled as escapes so they survive
 * editors and diffs. Neither can occur in a slug, a hex digest, or a
 * customer filename, so two distinct payloads cannot canonicalize to the
 * same string and collide as a false idempotent replay.
 */
const CANONICAL_FIELD_SEPARATOR = "";
const CANONICAL_LIST_SEPARATOR = "";

export function validateSlugFormat(slug: string): PublicationIssue | null {
  return PRODUCT_SLUG_PATTERN.test(slug)
    ? null
    : { code: "invalid_slug", slug };
}

export function resolvePublicationTarget(metadata: {
  slug?: string;
  targetProductSlug?: string;
}): PublicationTarget | null {
  if (metadata.targetProductSlug) {
    return { kind: "revision", targetProductSlug: metadata.targetProductSlug };
  }

  if (metadata.slug) {
    return { kind: "new", slug: metadata.slug };
  }

  return null;
}

type ProductPublicationDraftProps = {
  cover: ProductCoverInput;
  downloads: readonly ProductDownloadInput[];
  metadata: ProductVersionMetadata;
};

export class ProductPublicationDraft {
  readonly cover: ProductCoverInput;
  readonly downloads: readonly ProductDownloadInput[];
  readonly metadata: ProductVersionMetadata;

  private constructor(props: ProductPublicationDraftProps) {
    this.cover = props.cover;
    this.downloads = props.downloads;
    this.metadata = props.metadata;
  }

  static from(props: ProductPublicationDraftProps): ProductPublicationDraft {
    return new ProductPublicationDraft(props);
  }

  /**
   * Derived from the request as submitted rather than from a validated plan,
   * so an idempotent retry can be recognised before any validation runs.
   */
  requestDigest(
    operation: PublicationOperation,
    target: string,
    digest: ProductAssetDigest,
  ): string {
    const canonical = [
      operation,
      target,
      this.metadata.title,
      this.metadata.creatorName,
      this.metadata.cardSummary,
      this.metadata.detailDescription,
      this.metadata.includedItems.join(CANONICAL_LIST_SEPARATOR),
      this.metadata.typeSlugs.join(CANONICAL_LIST_SEPARATOR),
      this.metadata.goalSlugs.join(CANONICAL_LIST_SEPARATOR),
      this.cover.alt,
      digest.sha256(this.cover.bytes),
      this.downloads
        .map(
          (download) =>
            `${download.customerFilename}=${digest.sha256(download.bytes)}`,
        )
        .join(CANONICAL_LIST_SEPARATOR),
    ].join(CANONICAL_FIELD_SEPARATOR);

    return digest.sha256(new TextEncoder().encode(canonical));
  }

  /**
   * Settled before any validation runs. A retry of a request that already
   * published must replay it, not fail the slug-availability check against the
   * product the first attempt created.
   */
  settle(
    existing: StoredPublicationRecord | null,
    payloadDigest: string,
  ): PublishProductResult | null {
    if (!existing) {
      return null;
    }

    return existing.payloadDigest === payloadDigest
      ? { status: "replayed", publication: existing.publication }
      : { status: "idempotency_conflict" };
  }

  planCreation(
    input: {
      displayOrder: number;
      existingProduct: Product | null;
      slug: string;
    },
    taxonomy: StoreTaxonomySnapshot,
    digest: ProductAssetDigest,
  ): PublicationPlanResult {
    const formatIssue = validateSlugFormat(input.slug);

    if (formatIssue) {
      return { status: "invalid", issues: [formatIssue] };
    }

    if (input.existingProduct) {
      return {
        status: "invalid",
        issues: [{ code: "slug_taken", slug: input.slug }],
      };
    }

    return this.plan(
      {
        displayOrder: input.displayOrder,
        operation: "create_product",
        productId: null,
        productSlug: input.slug,
        versionSequence: 1,
      },
      taxonomy,
      digest,
    );
  }

  planRevision(
    product: Product | null,
    taxonomy: StoreTaxonomySnapshot,
    digest: ProductAssetDigest,
  ): PublicationPlanResult {
    if (!product) {
      return { status: "invalid", issues: [{ code: "product_not_found" }] };
    }

    if (!product.canBeRevised()) {
      return { status: "invalid", issues: [{ code: "product_retired" }] };
    }

    return this.plan(product.revisionPlacement(), taxonomy, digest);
  }

  plan(
    placement: PublicationPlacement,
    taxonomy: StoreTaxonomySnapshot,
    digest: ProductAssetDigest,
  ): PublicationPlanResult {
    const issues: PublicationIssue[] = [];
    const downloads = this.planDownloads(issues, digest);
    const cover = this.planCover(issues, digest);
    const types = resolveTaxonomy(
      this.metadata.typeSlugs,
      taxonomy.types,
      "unknown_type",
    );
    const goals = resolveTaxonomy(
      this.metadata.goalSlugs,
      taxonomy.goals,
      "unknown_goal",
    );

    issues.push(...types.issues, ...goals.issues);

    const totalUploadBytes = this.downloads.reduce(
      (total, download) => total + download.bytes.byteLength,
      this.cover.bytes.byteLength,
    );
    const sizeIssue = checkPayloadSize(this.cover, this.downloads);

    if (sizeIssue) {
      issues.push(sizeIssue);
    }

    if (issues.length > 0 || !cover) {
      return { status: "invalid", issues };
    }

    return {
      status: "valid",
      plan: {
        cover,
        displayOrder: placement.displayOrder,
        downloads,
        goals: goals.values,
        metadata: this.metadata,
        operation: placement.operation,
        productId: placement.productId,
        productSlug: placement.productSlug,
        totalUploadBytes,
        types: types.values,
        versionSequence: placement.versionSequence,
      },
    };
  }

  persistCommand(
    plan: PublicationPlan,
    input: {
      idempotencyKey: string;
      payloadDigest: string;
      publishedBy: PublishingPrincipal;
    },
  ): PersistPublicationCommand {
    return {
      cover: plan.cover,
      displayOrder: plan.displayOrder,
      downloads: plan.downloads,
      goalSlugs: plan.metadata.goalSlugs,
      idempotencyKey: input.idempotencyKey,
      metadata: plan.metadata,
      operation: plan.operation,
      payloadDigest: input.payloadDigest,
      productId: plan.productId,
      productSlug: plan.productSlug,
      publishedBy: input.publishedBy,
      typeSlugs: plan.metadata.typeSlugs,
      versionSequence: plan.versionSequence,
    };
  }

  /**
   * Writing these is not atomic, and does not need to be. A failure partway
   * through leaves earlier files on disk, but every key is the digest of its
   * own content, so the bytes are exactly what a later attempt would write and
   * that attempt reuses them. Nothing references an asset until the
   * publication commits.
   */
  plannedAssetContents(plan: PublicationPlan): readonly ProductAssetContent[] {
    return [
      { assetKey: plan.cover.assetKey, bytes: this.cover.bytes },
      ...plan.downloads.map((planned) => ({
        assetKey: planned.assetKey,
        bytes: this.downloads.find(
          (download) => download.customerFilename === planned.customerFilename,
        )!.bytes,
      })),
    ];
  }

  private planDownloads(
    issues: PublicationIssue[],
    digest: ProductAssetDigest,
  ): readonly PlannedProductAsset[] {
    if (this.downloads.length === 0) {
      issues.push({ code: "missing_downloads" });

      return [];
    }

    const planned: PlannedProductAsset[] = [];
    const seenFilenames = new Set<string>();

    for (const download of this.downloads) {
      if (seenFilenames.has(download.customerFilename)) {
        issues.push({
          code: "duplicate_customer_filename",
          customerFilename: download.customerFilename,
        });
        continue;
      }

      seenFilenames.add(download.customerFilename);

      const resolution = resolveDownloadFormat({
        bytes: download.bytes,
        customerFilename: download.customerFilename,
      });

      if (resolution.status === "unsupported_extension") {
        issues.push({
          code: "unsupported_download_extension",
          acceptedExtensions: STORE_DOWNLOAD_EXTENSIONS,
          customerFilename: download.customerFilename,
        });
        continue;
      }

      if (resolution.status === "content_mismatch") {
        issues.push({
          code: "download_content_mismatch",
          customerFilename: download.customerFilename,
        });
        continue;
      }

      const sha256 = digest.sha256(download.bytes);

      planned.push({
        assetKey: buildDownloadAssetKey({
          extension: resolution.format.extension,
          sha256,
        }),
        customerFilename: download.customerFilename,
        mimeType: resolution.format.mimeType,
        sha256,
        sizeBytes: download.bytes.byteLength,
      });
    }

    return planned;
  }

  private planCover(
    issues: PublicationIssue[],
    digest: ProductAssetDigest,
  ): PlannedProductCover | null {
    const resolution = resolveCoverFormat(this.cover.bytes);

    if (resolution.status === "unsupported_content") {
      issues.push({
        code: "unsupported_cover_content",
        acceptedExtensions: STORE_COVER_EXTENSIONS,
      });

      return null;
    }

    const sha256 = digest.sha256(this.cover.bytes);

    return {
      alt: this.cover.alt,
      assetKey: buildCoverAssetKey({
        extension: resolution.format.extension,
        sha256,
      }),
      mimeType: resolution.format.mimeType,
      sha256,
      sizeBytes: this.cover.bytes.byteLength,
    };
  }
}

type TaxonomyResolution = {
  issues: readonly PublicationIssue[];
  values: readonly StoreTaxonomyValue[];
};

function resolveTaxonomy(
  requestedSlugs: readonly string[],
  available: readonly StoreTaxonomyValue[],
  unknownCode: "unknown_goal" | "unknown_type",
): TaxonomyResolution {
  const values: StoreTaxonomyValue[] = [];
  const issues: PublicationIssue[] = [];

  for (const slug of requestedSlugs) {
    const match = available.find((value) => value.slug === slug);

    if (match) {
      values.push(match);
      continue;
    }

    issues.push({
      code: unknownCode,
      acceptedSlugs: available.map((value) => value.slug),
      slug,
    });
  }

  return { issues, values };
}

function checkPayloadSize(
  cover: ProductCoverInput,
  downloads: readonly ProductDownloadInput[],
): PublicationIssue | null {
  const totalBytes = downloads.reduce(
    (total, download) => total + download.bytes.byteLength,
    cover.bytes.byteLength,
  );

  return totalBytes > MAX_PUBLICATION_BYTES
    ? { code: "payload_too_large", maxBytes: MAX_PUBLICATION_BYTES, totalBytes }
    : null;
}
