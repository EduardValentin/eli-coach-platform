import type { RetireProductResult } from "./product-publication";
import type { StoreProductPublications } from "./store-product-publications";

export class RetireProductUseCase {
  constructor(
    private readonly options: { publications: StoreProductPublications },
  ) {}

  async execute(productId: number): Promise<RetireProductResult> {
    try {
      const retired = await this.options.publications.retireProduct(productId);

      return retired
        ? { status: "retired", productId }
        : { status: "not_found" };
    } catch {
      return { status: "unavailable" };
    }
  }
}
