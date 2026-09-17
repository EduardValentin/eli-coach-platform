import type { StoreTaxonomyValue } from "./models";
import {
  buildCoverAssetKey,
  buildDownloadAssetKey,
  type ProductAssetDigest,
  type ProductAssetWriter,
} from "./product-asset-writer";
import {
  resolveCoverFormat,
  resolveDownloadFormat,
  STORE_COVER_EXTENSIONS,
  STORE_DOWNLOAD_EXTENSIONS,
} from "./product-file-formats";
import {
  type PlannedProductAsset,
  type PlannedProductCover,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductPublication,
  type ProductVersionMetadata,
  type PublicationIssue,
  type PublicationOperation,
  type PublicationPlan,
  type PublicationPlanResult,
  type PublishingPrincipal,
  type PublishProductResult,
  type RetireProductResult,
} from "./product-publication-models";
import {
  buildPublicationDigest,
  checkPayloadSize,
  resolveTaxonomy,
  validateSlugFormat,
} from "./product-publication-rules";

export type PublishableProduct = {
  displayOrder: number;
  id: number;
  latestVersionSequence: number;
  lifecycleStatus: "archived" | "draft" | "published";
  slug: string;
};

export type StoreTaxonomySnapshot = {
  goals: readonly StoreTaxonomyValue[];
  types: readonly StoreTaxonomyValue[];
};

export type StoredPublicationRecord = {
  payloadDigest: string;
  publication: ProductPublication;
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

export interface StoreProductPublications {
  findProductById(productId: number): Promise<PublishableProduct | null>;
  findProductBySlug(slug: string): Promise<PublishableProduct | null>;
  findPublicationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<StoredPublicationRecord | null>;
  getNextDisplayOrder(): Promise<number>;
  getTaxonomy(): Promise<StoreTaxonomySnapshot>;
  persistPublication(
    command: PersistPublicationCommand,
  ): Promise<ProductPublication>;
  retireProduct(productId: number): Promise<boolean>;
}

export type PlanNewProductCommand = {
  cover: ProductCoverInput;
  downloads: readonly ProductDownloadInput[];
  metadata: ProductVersionMetadata;
  slug: string;
};

export type PlanProductRevisionCommand = {
  cover: ProductCoverInput;
  downloads: readonly ProductDownloadInput[];
  metadata: ProductVersionMetadata;
  productSlug: string;
};

export type PublishNewProductCommand = PlanNewProductCommand & {
  idempotencyKey: string;
  publishedBy: PublishingPrincipal;
};

export type PublishProductVersionCommand = {
  cover: ProductCoverInput;
  downloads: readonly ProductDownloadInput[];
  idempotencyKey: string;
  metadata: ProductVersionMetadata;
  productId: number;
  publishedBy: PublishingPrincipal;
};

type StoreProductPublicationServiceOptions = {
  assetWriter: ProductAssetWriter;
  digest: ProductAssetDigest;
  repository: StoreProductPublications;
};

type PayloadPlacement = {
  displayOrder: number;
  operation: PublicationOperation;
  productId: number | null;
  productSlug: string;
  versionSequence: number;
};

export class StoreProductPublicationService {
  private readonly assetWriter: ProductAssetWriter;
  private readonly digest: ProductAssetDigest;
  private readonly repository: StoreProductPublications;

  constructor(options: StoreProductPublicationServiceOptions) {
    this.assetWriter = options.assetWriter;
    this.digest = options.digest;
    this.repository = options.repository;
  }

  async planNewProduct(
    command: PlanNewProductCommand,
  ): Promise<PublicationPlanResult> {
    try {
      return await this.planCreation(command);
    } catch {
      return { status: "unavailable" };
    }
  }

  async planProductRevision(
    command: PlanProductRevisionCommand,
  ): Promise<PublicationPlanResult> {
    try {
      const product = await this.repository.findProductBySlug(
        command.productSlug,
      );

      return await this.planRevision(command, product);
    } catch {
      return { status: "unavailable" };
    }
  }

  async publishNewProduct(
    command: PublishNewProductCommand,
  ): Promise<PublishProductResult> {
    try {
      const payloadDigest = this.buildRequestDigest(
        "create_product",
        command.slug,
        command,
      );
      const settled = await this.settleIdempotency(
        command.idempotencyKey,
        payloadDigest,
      );

      return (
        settled ??
        (await this.commitPlan(
          await this.planCreation(command),
          command,
          payloadDigest,
        ))
      );
    } catch {
      return { status: "unavailable" };
    }
  }

  async publishProductVersion(
    command: PublishProductVersionCommand,
  ): Promise<PublishProductResult> {
    try {
      const payloadDigest = this.buildRequestDigest(
        "revise_product",
        String(command.productId),
        command,
      );
      const settled = await this.settleIdempotency(
        command.idempotencyKey,
        payloadDigest,
      );

      if (settled) {
        return settled;
      }

      const product = await this.repository.findProductById(command.productId);

      return await this.commitPlan(
        await this.planRevision(command, product),
        command,
        payloadDigest,
      );
    } catch {
      return { status: "unavailable" };
    }
  }

  /**
   * Settled before any validation runs. A retry of a request that already
   * published must replay it, not fail the slug-availability check against the
   * product the first attempt created.
   */
  private async settleIdempotency(
    idempotencyKey: string,
    payloadDigest: string,
  ): Promise<PublishProductResult | null> {
    const existing =
      await this.repository.findPublicationByIdempotencyKey(idempotencyKey);

    if (!existing) {
      return null;
    }

    return existing.payloadDigest === payloadDigest
      ? { status: "replayed", publication: existing.publication }
      : { status: "idempotency_conflict" };
  }

  async retireProduct(productId: number): Promise<RetireProductResult> {
    try {
      const retired = await this.repository.retireProduct(productId);

      return retired
        ? { status: "retired", productId }
        : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }

  private async planCreation(
    command: PlanNewProductCommand,
  ): Promise<PublicationPlanResult> {
    const slugIssues = await this.validateProposedSlug(command.slug);

    if (slugIssues.length > 0) {
      return { status: "invalid", issues: slugIssues };
    }

    return this.buildPlan(command, {
      displayOrder: await this.repository.getNextDisplayOrder(),
      operation: "create_product",
      productId: null,
      productSlug: command.slug,
      versionSequence: 1,
    });
  }

  private async planRevision(
    command: {
      cover: ProductCoverInput;
      downloads: readonly ProductDownloadInput[];
      metadata: ProductVersionMetadata;
    },
    product: PublishableProduct | null,
  ): Promise<PublicationPlanResult> {
    if (!product) {
      return { status: "invalid", issues: [{ code: "product_not_found" }] };
    }

    if (product.lifecycleStatus === "archived") {
      return { status: "invalid", issues: [{ code: "product_retired" }] };
    }

    return this.buildPlan(command, {
      displayOrder: product.displayOrder,
      operation: "revise_product",
      productId: product.id,
      productSlug: product.slug,
      versionSequence: product.latestVersionSequence + 1,
    });
  }

  private async validateProposedSlug(
    slug: string,
  ): Promise<readonly PublicationIssue[]> {
    const formatIssue = validateSlugFormat(slug);

    if (formatIssue) {
      return [formatIssue];
    }

    const existing = await this.repository.findProductBySlug(slug);

    return existing ? [{ code: "slug_taken", slug }] : [];
  }

  private async buildPlan(
    command: {
      cover: ProductCoverInput;
      downloads: readonly ProductDownloadInput[];
      metadata: ProductVersionMetadata;
    },
    placement: PayloadPlacement,
  ): Promise<PublicationPlanResult> {
    const taxonomy = await this.repository.getTaxonomy();
    const issues: PublicationIssue[] = [];
    const downloads = this.planDownloads(command.downloads, issues);
    const cover = this.planCover(command.cover, issues);
    const types = resolveTaxonomy(
      command.metadata.typeSlugs,
      taxonomy.types,
      "unknown_type",
    );
    const goals = resolveTaxonomy(
      command.metadata.goalSlugs,
      taxonomy.goals,
      "unknown_goal",
    );

    issues.push(...types.issues, ...goals.issues);

    const totalUploadBytes = command.downloads.reduce(
      (total, download) => total + download.bytes.byteLength,
      command.cover.bytes.byteLength,
    );
    const sizeIssue = checkPayloadSize(command.cover, command.downloads);

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
        metadata: command.metadata,
        operation: placement.operation,
        productId: placement.productId,
        productSlug: placement.productSlug,
        totalUploadBytes,
        types: types.values,
        versionSequence: placement.versionSequence,
      },
    };
  }

  private planDownloads(
    downloads: readonly ProductDownloadInput[],
    issues: PublicationIssue[],
  ): readonly PlannedProductAsset[] {
    if (downloads.length === 0) {
      issues.push({ code: "missing_downloads" });

      return [];
    }

    const planned: PlannedProductAsset[] = [];
    const seenFilenames = new Set<string>();

    for (const download of downloads) {
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

      const sha256 = this.digest.sha256(download.bytes);

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
    cover: ProductCoverInput,
    issues: PublicationIssue[],
  ): PlannedProductCover | null {
    const resolution = resolveCoverFormat(cover.bytes);

    if (resolution.status === "unsupported_content") {
      issues.push({
        code: "unsupported_cover_content",
        acceptedExtensions: STORE_COVER_EXTENSIONS,
      });

      return null;
    }

    const sha256 = this.digest.sha256(cover.bytes);

    return {
      alt: cover.alt,
      assetKey: buildCoverAssetKey({
        extension: resolution.format.extension,
        sha256,
      }),
      mimeType: resolution.format.mimeType,
      sha256,
      sizeBytes: cover.bytes.byteLength,
    };
  }

  private async commitPlan(
    planResult: PublicationPlanResult,
    command: {
      cover: ProductCoverInput;
      downloads: readonly ProductDownloadInput[];
      idempotencyKey: string;
      publishedBy: PublishingPrincipal;
    },
    payloadDigest: string,
  ): Promise<PublishProductResult> {
    if (planResult.status !== "valid") {
      return planResult.status === "invalid"
        ? { status: "invalid", issues: planResult.issues }
        : { status: "unavailable" };
    }

    const plan = planResult.plan;

    await this.writePlannedAssets(plan, command);

    return {
      status: "published",
      publication: await this.repository.persistPublication({
        cover: plan.cover,
        displayOrder: plan.displayOrder,
        downloads: plan.downloads,
        goalSlugs: plan.metadata.goalSlugs,
        idempotencyKey: command.idempotencyKey,
        metadata: plan.metadata,
        operation: plan.operation,
        payloadDigest,
        productId: plan.productId,
        productSlug: plan.productSlug,
        publishedBy: command.publishedBy,
        typeSlugs: plan.metadata.typeSlugs,
        versionSequence: plan.versionSequence,
      }),
    };
  }

  /**
   * Not atomic, and does not need to be. A failure partway through leaves
   * earlier files on disk, but every key is the digest of its own content, so
   * the bytes are exactly what a later attempt would write and that attempt
   * reuses them. Nothing references an asset until the publication commits.
   */
  private async writePlannedAssets(
    plan: PublicationPlan,
    command: {
      cover: ProductCoverInput;
      downloads: readonly ProductDownloadInput[];
    },
  ): Promise<void> {
    await this.assetWriter.write({
      assetKey: plan.cover.assetKey,
      bytes: command.cover.bytes,
    });

    for (const planned of plan.downloads) {
      const source = command.downloads.find(
        (download) => download.customerFilename === planned.customerFilename,
      )!;

      await this.assetWriter.write({
        assetKey: planned.assetKey,
        bytes: source.bytes,
      });
    }
  }

  /**
   * Derived from the request as submitted rather than from a validated plan,
   * so an idempotent retry can be recognised before any validation runs.
   */
  private buildRequestDigest(
    operation: PublicationOperation,
    target: string,
    command: {
      cover: ProductCoverInput;
      downloads: readonly ProductDownloadInput[];
      metadata: ProductVersionMetadata;
    },
  ): string {
    return buildPublicationDigest(
      {
        cover: command.cover,
        downloads: command.downloads,
        metadata: command.metadata,
        operation,
        target,
      },
      (bytes) => this.digest.sha256(bytes),
    );
  }
}
