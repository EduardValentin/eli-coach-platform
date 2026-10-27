import type { ProductAssetDigest } from "./product-assets";
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
      const taxonomy = await this.options.publications.getTaxonomy();

      return ProductPublicationDraft.from(command).planRevision(
        product,
        taxonomy,
        this.options.digest,
      );
    } catch {
      return { status: "unavailable" };
    }
  }
}
