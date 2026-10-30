import type { PublishedProduct } from "./product";
import type { StoreCatalogPort } from "./store-catalog-port";

export type PublishedCatalogResult =
  | { status: "available"; products: readonly PublishedProduct[] }
  | { status: "unavailable" };

export class ListPublishedProductsUseCase {
  constructor(
    private readonly options: { storeCatalogPort: StoreCatalogPort },
  ) {}

  async execute(): Promise<PublishedCatalogResult> {
    try {
      return {
        status: "available",
        products: await this.options.storeCatalogPort.getPublishedCatalog(),
      };
    } catch {
      return { status: "unavailable" };
    }
  }
}
