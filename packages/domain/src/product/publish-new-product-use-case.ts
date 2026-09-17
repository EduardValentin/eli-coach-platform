import type { ProductAssetDigest, ProductAssetWriter } from "./product-assets";
import {
  ProductPublicationDraft,
  validateSlugFormat,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type PublicationIssue,
  type PublicationPlan,
  type PublicationPlanResult,
  type PublishingPrincipal,
  type PublishProductResult,
} from "./product-publication";
import type { StoreProductPublications } from "./store-product-publications";

export type PublishNewProductCommand = {
  cover: ProductCoverInput;
  downloads: readonly ProductDownloadInput[];
  idempotencyKey: string;
  metadata: ProductVersionMetadata;
  publishedBy: PublishingPrincipal;
  slug: string;
};

export class PublishNewProductUseCase {
  constructor(
    private readonly options: {
      assetWriter: ProductAssetWriter;
      digest: ProductAssetDigest;
      publications: StoreProductPublications;
    },
  ) {}

  async execute(
    command: PublishNewProductCommand,
  ): Promise<PublishProductResult> {
    try {
      const draft = ProductPublicationDraft.from(command);
      const payloadDigest = draft.requestDigest(
        "create_product",
        command.slug,
        this.options.digest,
      );
      const settled = draft.settle(
        await this.options.publications.findPublicationByIdempotencyKey(
          command.idempotencyKey,
        ),
        payloadDigest,
      );

      return (
        settled ??
        (await this.commitPlan(
          await this.planCreation(draft, command.slug),
          command,
          payloadDigest,
        ))
      );
    } catch {
      return { status: "unavailable" };
    }
  }

  private async planCreation(
    draft: ProductPublicationDraft,
    slug: string,
  ): Promise<PublicationPlanResult> {
    const slugIssues = await this.validateProposedSlug(slug);

    if (slugIssues.length > 0) {
      return { status: "invalid", issues: slugIssues };
    }

    return draft.plan(
      {
        displayOrder: await this.options.publications.getNextDisplayOrder(),
        operation: "create_product",
        productId: null,
        productSlug: slug,
        versionSequence: 1,
      },
      await this.options.publications.getTaxonomy(),
      this.options.digest,
    );
  }

  private async validateProposedSlug(
    slug: string,
  ): Promise<readonly PublicationIssue[]> {
    const formatIssue = validateSlugFormat(slug);

    if (formatIssue) {
      return [formatIssue];
    }

    const existing = await this.options.publications.findProductBySlug(slug);

    return existing ? [{ code: "slug_taken", slug }] : [];
  }

  private async commitPlan(
    planResult: PublicationPlanResult,
    command: PublishNewProductCommand,
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
      publication: await this.options.publications.persistPublication({
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
    command: PublishNewProductCommand,
  ): Promise<void> {
    await this.options.assetWriter.write({
      assetKey: plan.cover.assetKey,
      bytes: command.cover.bytes,
    });

    for (const planned of plan.downloads) {
      const source = command.downloads.find(
        (download) => download.customerFilename === planned.customerFilename,
      )!;

      await this.options.assetWriter.write({
        assetKey: planned.assetKey,
        bytes: source.bytes,
      });
    }
  }
}
