import type { ProductAssetDigest } from "./product-assets";
import {
  ProductPublicationDraft,
  validateSlugFormat,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type PublicationPlanResult,
} from "./product-publication";
import type { StoreProductPublications } from "./store-product-publications";

export type PlanNewProductCommand = {
  cover: ProductCoverInput;
  downloads: readonly ProductDownloadInput[];
  metadata: ProductVersionMetadata;
  slug: string;
};

export class PlanNewProductUseCase {
  constructor(
    private readonly options: {
      digest: ProductAssetDigest;
      publications: StoreProductPublications;
    },
  ) {}

  async execute(
    command: PlanNewProductCommand,
  ): Promise<PublicationPlanResult> {
    const formatIssue = validateSlugFormat(command.slug);

    if (formatIssue) {
      return { status: "invalid", issues: [formatIssue] };
    }

    try {
      const existingProduct = await this.options.publications.findProductBySlug(
        command.slug,
      );
      const displayOrder =
        await this.options.publications.getNextDisplayOrder();
      const taxonomy = await this.options.publications.getTaxonomy();

      return ProductPublicationDraft.from(command).planCreation(
        { displayOrder, existingProduct, slug: command.slug },
        taxonomy,
        this.options.digest,
      );
    } catch {
      return { status: "unavailable" };
    }
  }
}
