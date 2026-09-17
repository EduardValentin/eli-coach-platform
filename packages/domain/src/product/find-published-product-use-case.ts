import type { PublishedProduct } from "./product";
import type { StoreCatalog } from "./store-catalog";

export type PublishedProductResult =
  | { status: "available"; product: PublishedProduct }
  | { status: "not_found" }
  | { status: "unavailable" };

export class FindPublishedProductUseCase {
  constructor(private readonly options: { catalog: StoreCatalog }) {}

  async execute(slug: string): Promise<PublishedProductResult> {
    try {
      const product =
        await this.options.catalog.getPublishedProductBySlug(slug);

      return product
        ? { status: "available", product }
        : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }
}
