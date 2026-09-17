import type { Product } from "./product";
import type { ProductAssetDigest, ProductAssetWriter } from "./product-assets";
import {
  ProductPublicationDraft,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type PublicationPlan,
  type PublicationPlanResult,
  type PublishingPrincipal,
  type PublishProductResult,
} from "./product-publication";
import type { StoreProductPublications } from "./store-product-publications";

export type PublishProductVersionCommand = {
  cover: ProductCoverInput;
  downloads: readonly ProductDownloadInput[];
  idempotencyKey: string;
  metadata: ProductVersionMetadata;
  productId: number;
  publishedBy: PublishingPrincipal;
};

export class PublishProductVersionUseCase {
  constructor(
    private readonly options: {
      assetWriter: ProductAssetWriter;
      digest: ProductAssetDigest;
      publications: StoreProductPublications;
    },
  ) {}

  async execute(
    command: PublishProductVersionCommand,
  ): Promise<PublishProductResult> {
    try {
      const draft = ProductPublicationDraft.from(command);
      const payloadDigest = draft.requestDigest(
        "revise_product",
        String(command.productId),
        this.options.digest,
      );
      const settled = draft.settle(
        await this.options.publications.findPublicationByIdempotencyKey(
          command.idempotencyKey,
        ),
        payloadDigest,
      );

      if (settled) {
        return settled;
      }

      const product = await this.options.publications.findProductById(
        command.productId,
      );

      return await this.commitPlan(
        await this.planRevision(draft, product),
        command,
        payloadDigest,
      );
    } catch {
      return { status: "unavailable" };
    }
  }

  private async planRevision(
    draft: ProductPublicationDraft,
    product: Product | null,
  ): Promise<PublicationPlanResult> {
    if (!product) {
      return { status: "invalid", issues: [{ code: "product_not_found" }] };
    }

    if (!product.canBeRevised()) {
      return { status: "invalid", issues: [{ code: "product_retired" }] };
    }

    return draft.plan(
      {
        displayOrder: product.displayOrder,
        operation: "revise_product",
        productId: product.id,
        productSlug: product.slug,
        versionSequence: product.nextVersionSequence(),
      },
      await this.options.publications.getTaxonomy(),
      this.options.digest,
    );
  }

  private async commitPlan(
    planResult: PublicationPlanResult,
    command: PublishProductVersionCommand,
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
    command: PublishProductVersionCommand,
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
