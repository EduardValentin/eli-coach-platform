import type { PublishedProduct, PublishedProductCover } from "./product";

export interface StoreCatalogPort {
  getPublishedCatalog(): Promise<readonly PublishedProduct[]>;
  getPublishedProductBySlug(slug: string): Promise<PublishedProduct | null>;
  getPublishedCoverByAssetKey(
    assetKey: string,
  ): Promise<PublishedProductCover | null>;
}
