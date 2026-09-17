import type { Product } from "./product";
import type {
  PersistPublicationCommand,
  ProductPublication,
  StoredPublicationRecord,
  StoreTaxonomySnapshot,
} from "./product-publication";

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
