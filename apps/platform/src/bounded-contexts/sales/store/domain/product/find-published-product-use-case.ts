import type { PublishedProduct } from "./product";
import type { StoreCatalogPort } from "./store-catalog-port";

export type PublishedProductResult =
  | { status: "available"; product: PublishedProduct }
  | { status: "not_found" }
  | { status: "unavailable" };

export class FindPublishedProductUseCase {
  constructor(
    private readonly options: { storeCatalogPort: StoreCatalogPort },
  ) {}

  async execute(slug: string): Promise<PublishedProductResult> {
    try {
      const product =
        await this.options.storeCatalogPort.getPublishedProductBySlug(slug);

      return product
        ? { status: "available", product }
        : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }
}
