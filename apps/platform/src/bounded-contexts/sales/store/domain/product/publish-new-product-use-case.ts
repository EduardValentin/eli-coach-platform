import type { ProductAssetWriterPort } from "./product-asset-writer-port";
import type { ProductAssetDigestPort } from "./product-asset-digest-port";
import {
  ProductPublicationDraft,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type PublicationPlanResult,
  type PublishingPrincipal,
  type PublishProductResult,
} from "./product-publication";
import type { StoreProductPublicationsPort } from "./store-product-publications-port";

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
      productAssetWriterPort: ProductAssetWriterPort;
      productAssetDigestPort: ProductAssetDigestPort;
      storeProductPublicationsPort: StoreProductPublicationsPort;
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
        this.options.productAssetDigestPort,
      );
      const settled = draft.settle(
        await this.options.storeProductPublicationsPort.findPublicationByIdempotencyKey(
          command.idempotencyKey,
        ),
        payloadDigest,
      );

      if (settled) {
        return settled;
      }

      const existingProduct =
        await this.options.storeProductPublicationsPort.findProductBySlug(
          command.slug,
        );
      const displayOrder =
        await this.options.storeProductPublicationsPort.getNextDisplayOrder();
      const taxonomy =
        await this.options.storeProductPublicationsPort.getTaxonomy();

      return await this.commit(
        draft,
        draft.planCreation(
          { displayOrder, existingProduct, slug: command.slug },
          taxonomy,
          this.options.productAssetDigestPort,
        ),
        {
          idempotencyKey: command.idempotencyKey,
          payloadDigest,
          publishedBy: command.publishedBy,
        },
      );
    } catch {
      return { status: "unavailable" };
    }
  }

  private async commit(
    draft: ProductPublicationDraft,
    planResult: PublicationPlanResult,
    input: {
      idempotencyKey: string;
      payloadDigest: string;
      publishedBy: PublishingPrincipal;
    },
  ): Promise<PublishProductResult> {
    if (planResult.status !== "valid") {
      return planResult.status === "invalid"
        ? { status: "invalid", issues: planResult.issues }
        : { status: "unavailable" };
    }

    for (const content of draft.plannedAssetContents(planResult.plan)) {
      await this.options.productAssetWriterPort.write(content);
    }

    return {
      status: "published",
      publication:
        await this.options.storeProductPublicationsPort.persistPublication(
          draft.persistCommand(planResult.plan, input),
        ),
    };
  }
}
