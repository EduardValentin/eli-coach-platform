import type {
  PublishedProductCover,
  PublishedStoreProduct,
} from "./models";

export interface StoreCatalogRepository {
  getPublishedCatalog(): Promise<readonly PublishedStoreProduct[]>;
  getPublishedProductBySlug(
    slug: string,
  ): Promise<PublishedStoreProduct | null>;
  getPublishedCoverByAssetKey(
    assetKey: string,
  ): Promise<PublishedProductCover | null>;
}

export type PublishedCatalogResult =
  | {
      status: "available";
      products: readonly PublishedStoreProduct[];
    }
  | { status: "unavailable" };

export type PublishedProductResult =
  | {
      status: "available";
      product: PublishedStoreProduct;
    }
  | { status: "not_found" }
  | { status: "unavailable" };

export type PublishedCoverResult =
  | {
      status: "available";
      cover: PublishedProductCover;
    }
  | { status: "not_found" }
  | { status: "unavailable" };

export class StoreCatalogService {
  constructor(private readonly repository: StoreCatalogRepository) {}

  async getPublishedCatalog(): Promise<PublishedCatalogResult> {
    try {
      return {
        status: "available",
        products: await this.repository.getPublishedCatalog(),
      };
    } catch {
      return { status: "unavailable" };
    }
  }

  async getPublishedProductBySlug(
    slug: string,
  ): Promise<PublishedProductResult> {
    try {
      const product = await this.repository.getPublishedProductBySlug(slug);

      return product
        ? { status: "available", product }
        : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }

  async getPublishedCoverByAssetKey(
    assetKey: string,
  ): Promise<PublishedCoverResult> {
    try {
      const cover =
        await this.repository.getPublishedCoverByAssetKey(assetKey);

      return cover ? { status: "available", cover } : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }
}
