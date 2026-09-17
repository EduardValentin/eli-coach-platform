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

      if (settled) {
        return settled;
      }

      const existingProduct = await this.options.publications.findProductBySlug(
        command.slug,
      );
      const displayOrder =
        await this.options.publications.getNextDisplayOrder();
      const taxonomy = await this.options.publications.getTaxonomy();

      return await this.commit(
        draft,
        draft.planCreation(
          { displayOrder, existingProduct, slug: command.slug },
          taxonomy,
          this.options.digest,
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
