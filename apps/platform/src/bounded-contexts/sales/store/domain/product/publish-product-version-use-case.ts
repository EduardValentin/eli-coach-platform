import type { ProductAssetDigest, ProductAssetWriter } from "./product-assets";
import {
  ProductPublicationDraft,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
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
      const taxonomy = await this.options.publications.getTaxonomy();

      return await this.commit(
        draft,
        draft.planRevision(product, taxonomy, this.options.digest),
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
      await this.options.assetWriter.write(content);
    }

    return {
      status: "published",
      publication: await this.options.publications.persistPublication(
        draft.persistCommand(planResult.plan, input),
      ),
    };
  }
}
