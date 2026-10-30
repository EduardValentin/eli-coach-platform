import type { PublishedProduct } from "./product";
import type { StoreCatalogPort } from "./store-catalog-port";

export type PublishedCatalogResult =
  | { status: "available"; products: readonly PublishedProduct[] }
  | { status: "unavailable" };

export class ListPublishedProductsUseCase {
  constructor(private readonly options: { catalog: StoreCatalogPort }) {}

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
