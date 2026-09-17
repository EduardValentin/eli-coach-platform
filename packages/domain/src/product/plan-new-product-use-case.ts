import type { ProductAssetDigest, ProductAssetWriter } from "./product-assets";
import {
  ProductPublicationDraft,
  validateSlugFormat,
  type ProductCoverInput,
  type ProductDownloadInput,
  type ProductVersionMetadata,
  type PublicationIssue,
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
      assetWriter: ProductAssetWriter;
      digest: ProductAssetDigest;
      publications: StoreProductPublications;
    },
  ) {}

  async execute(
    command: PlanNewProductCommand,
  ): Promise<PublicationPlanResult> {
    try {
      const slugIssues = await this.validateProposedSlug(command.slug);

      if (slugIssues.length > 0) {
        return { status: "invalid", issues: slugIssues };
      }

      return ProductPublicationDraft.from(command).plan(
        {
          displayOrder: await this.options.publications.getNextDisplayOrder(),
          operation: "create_product",
          productId: null,
          productSlug: command.slug,
          versionSequence: 1,
        },
        await this.options.publications.getTaxonomy(),
        this.options.digest,
      );
    } catch {
      return { status: "unavailable" };
    }
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
}
