import type { Product } from "./product";
import type { ProductAssetDigest, ProductAssetWriter } from "./product-assets";
import {
  ProductPublicationDraft,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type PublicationPlanResult,
} from "./product-publication";
import type { StoreProductPublications } from "./store-product-publications";

export type PlanProductRevisionCommand = {
  cover: ProductCoverInput;
  downloads: readonly ProductDownloadInput[];
  metadata: ProductVersionMetadata;
  productSlug: string;
};

export class PlanProductRevisionUseCase {
  constructor(
    private readonly options: {
      assetWriter: ProductAssetWriter;
      digest: ProductAssetDigest;
      publications: StoreProductPublications;
    },
  ) {}

  async execute(
    command: PlanProductRevisionCommand,
  ): Promise<PublicationPlanResult> {
    try {
      const product = await this.options.publications.findProductBySlug(
        command.productSlug,
      );

      return await this.planRevision(
        ProductPublicationDraft.from(command),
        product,
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
}
