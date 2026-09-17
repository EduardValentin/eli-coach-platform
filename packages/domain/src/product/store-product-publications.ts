import type { Product } from "./product";
import type {
  PlannedProductAsset,
  PlannedProductCover,
  ProductPublication,
  ProductVersionMetadata,
  PublicationOperation,
  PublishingPrincipal,
  StoredPublicationRecord,
  StoreTaxonomySnapshot,
} from "./product-publication";

export type PersistPublicationCommand = {
  cover: PlannedProductCover;
  displayOrder: number;
  downloads: readonly PlannedProductAsset[];
  goalSlugs: readonly string[];
  idempotencyKey: string;
  metadata: ProductVersionMetadata;
  operation: PublicationOperation;
  payloadDigest: string;
  productId: number | null;
  productSlug: string;
  publishedBy: PublishingPrincipal;
  typeSlugs: readonly string[];
  versionSequence: number;
};

export interface StoreProductPublications {
  findProductById(productId: number): Promise<Product | null>;
  findProductBySlug(slug: string): Promise<Product | null>;
  findPublicationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<StoredPublicationRecord | null>;
  getNextDisplayOrder(): Promise<number>;
  getTaxonomy(): Promise<StoreTaxonomySnapshot>;
  persistPublication(
    command: PersistPublicationCommand,
  ): Promise<ProductPublication>;
  retireProduct(productId: number): Promise<boolean>;
}
