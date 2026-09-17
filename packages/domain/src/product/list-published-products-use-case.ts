import type { PublishedProduct } from "./product";
import type { StoreCatalog } from "./store-catalog";

export type PublishedCatalogResult =
  | { status: "available"; products: readonly PublishedProduct[] }
  | { status: "unavailable" };

export class ListPublishedProductsUseCase {
  constructor(private readonly options: { catalog: StoreCatalog }) {}

  async execute(): Promise<PublishedCatalogResult> {
    try {
      return {
        status: "available",
        products: await this.options.catalog.getPublishedCatalog(),
      };
    } catch {
      return { status: "unavailable" };
    }
  }
}
