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
      productAssetWriterPort: ProductAssetWriterPort;
      productAssetDigestPort: ProductAssetDigestPort;
      storeProductPublicationsPort: StoreProductPublicationsPort;
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

      const product =
        await this.options.storeProductPublicationsPort.findProductById(
          command.productId,
        );
      const taxonomy =
        await this.options.storeProductPublicationsPort.getTaxonomy();

      return await this.commit(
        draft,
        draft.planRevision(
          product,
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
