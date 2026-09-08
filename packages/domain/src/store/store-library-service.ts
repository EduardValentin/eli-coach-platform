import type { PublishedStoreProduct } from "./models";

export interface StoreLibraryRepository {
  listOwnedProducts(
    accountId: string,
  ): Promise<readonly PublishedStoreProduct[]>;
  findOwnedProductBySlug(query: {
    accountId: string;
    slug: string;
  }): Promise<PublishedStoreProduct | null>;
}

export type OwnedProductsResult =
  | {
      status: "available";
      products: readonly PublishedStoreProduct[];
    }
  | { status: "unavailable" };

export type OwnedProductResult =
  | {
      status: "available";
      product: PublishedStoreProduct;
    }
  | { status: "not_found" }
  | { status: "unavailable" };

export class StoreLibraryService {
  constructor(private readonly repository: StoreLibraryRepository) {}

  async listOwnedProducts(accountId: string): Promise<OwnedProductsResult> {
    try {
      return {
        status: "available",
        products: await this.repository.listOwnedProducts(accountId),
      };
    } catch {
      return { status: "unavailable" };
    }
  }

  async findOwnedProductBySlug(query: {
    accountId: string;
    slug: string;
  }): Promise<OwnedProductResult> {
    try {
      const product = await this.repository.findOwnedProductBySlug(query);

      return product
        ? { status: "available", product }
        : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }
}
