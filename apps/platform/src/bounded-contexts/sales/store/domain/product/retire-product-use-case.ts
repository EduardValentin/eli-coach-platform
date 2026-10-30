import type { RetireProductResult } from "./product-publication";
import type { StoreProductPublicationsPort } from "./store-product-publications-port";

export class RetireProductUseCase {
  constructor(
    private readonly options: { publications: StoreProductPublicationsPort },
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
